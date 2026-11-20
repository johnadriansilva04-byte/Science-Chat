/**
 * Filtro anti-repetição e anti-clichê para as respostas do chat.
 *
 * O llama-3.3 (Workers AI) tem dois vícios que transformam o diálogo num loop:
 *  1. encerra quase todo turno com a MESMA fórmula ("Qual é o próximo passo?",
 *     "O que mais você gostaria de acrescentar?", "Como posso ajudar?");
 *  2. repete frases — dentro da mesma resposta e entre turnos.
 *
 * Pedir educadamente no prompt não basta: o modelo volta ao vício assim que o
 * histórico fica longo (e o histórico envenenado o reensina). Este módulo remove
 * o vício de forma DETERMINÍSTICA, na saída — ao vivo (stream) e no histórico
 * salvo. É puro, sem I/O, para poder ser testado e reaplicado.
 *
 * Regra de segurança: NUNCA produzir resposta vazia. Um clichê de fecho só é
 * descartado quando a mesma resposta traz conteúdo de verdade; se a filtragem
 * zeraria o texto, o clichê é liberado.
 */

import type { ModelMessage, TextStreamPart, ToolSet } from "ai";

/** Abreviações comuns em texto científico que NÃO encerram uma frase. */
const ABBREVIATION_RE =
  /\b(?:et al|etc|cf|fig|figs|apud|op|cit|vs|sr|sra|dr|dra|prof|ed|pp?|no)\.$/i;

/**
 * Fórmulas de fecho VAZIAS: não trazem informação, só empurram a conversa de
 * volta para o pesquisador ("Qual é o próximo passo?"). São o que o pesquisador
 * mais reclama. Descartadas quando a resposta tem conteúdo de verdade.
 */
const CLOSER_PATTERNS: RegExp[] = [
  /qual (?:é|e|seria|ser[aá]) (?:o )?pr[óo]xim[ao] (?:passo|etapa|parte|movimento)/i,
  /(?:o )?que (?:mais )?(?:voc[êe] )?(?:gostaria|quer|deseja) (?:de )?(?:acrescentar|adicionar|fazer|ver|mudar|alterar|explorar)/i,
  /(?:qual|quais) (?:seria|seriam|é|e) (?:a|as|o|os) (?:pr[óo]xim[ao]s? )?(?:passo|etapa|parte|movimento|aç[ãa]o)/i,
  /(?:voc[êe] )?(?:gostaria|quer|deseja) que eu (?:continue|prossiga|siga|avance)/i,
  /como (?:posso|podemos) (?:ajudar|prosseguir|continuar|seguir)/i,
  /posso (?:ajudar|fazer) (?:em|com)? ?(?:mais )?(?:alguma coisa|algo)/i,
  /(?:h[áa]|tem) algo mais (?:que|para|em|a)/i,
  /por onde (?:voc[êe] )?(?:quer|gostaria|deseja) (?:começar|seguir|continuar)/i,
  /(?:me )?(?:diga|diz) (?:o que|qual|por onde) (?:fazer|seguir|quer)/i,
  /o que (?:voc[êe] )?(?:gostaria|quer|deseja) (?:que eu )?(?:faça|fazer) (?:a seguir|agora|em seguida)/i,
  // "Você gostaria de <verbo vago> …?" — convite vazio. Verbos CONCRETOS
  // (incluir/adicionar um item real) ficam de fora: aí a oferta tem conteúdo.
  /(?:voc[êe] )?(?:gostaria|quer|deseja) de (?:explorar|falar|conversar|discutir|saber|entender|ver|seguir|continuar|prosseguir|começar|saber mais)/i,
  /(?:podemos|vamos) (?:prosseguir|continuar|seguir|avançar)\??$/i,
  // Devolve a condução ao pesquisador: na entrevista quem pergunta é o Pracinha.
  /qual (?:é|e|seria|ser[aá]) (?:a )?(?:sua |tua )?pr[óo]xim[ao] (?:pergunta|d[úu]vida|quest[ãa]o)/i,
  /(?:o que|quais) (?:voc[êe] )?(?:gostaria|quer|deseja) (?:de )?(?:saber|perguntar|descobrir) (?:agora|a seguir|em seguida)/i,
  /(?:em que|como) (?:mais )?(?:posso|podemos) (?:te )?(?:ajudar|auxiliar)/i,
];

/**
 * Re-apresentação: "Olá, sou o Pracinha, assistente da ScienceChat". Verdadeira
 * na primeira mensagem, inútil (e irritante) no meio da conversa — o modelo
 * cumprimenta de novo depois de uma mensagem longa do pesquisador, como se a
 * conversa tivesse recomeçado.
 */
const GREETING_PATTERNS: RegExp[] = [
  /^(?:ola|oi|opa|e ai|bem-vind[oa])\b[^.!?]{0,80}\bsou (?:o |a )?(?:pracinha|assistente)/,
  /^sou (?:o |a )?(?:pracinha|assistente d[ao] scien[çc]echat)\b/,
  /^(?:ola|oi|opa)\b[^.!?]{0,40}\bassistente d[ao] scien[çc]echat\b/,
  /^(?:estou aqui|estou pronto) para (?:te |lhe )?ajudar/,
  /^(?:vamos|podemos) come[çc]ar (?:a estruturar|o artigo|a construir)/,
  // Saudação solta ("Olá!", "Oi!") sobrava depois de cortar a apresentação e
  // aparecia no meio do diálogo como se a conversa tivesse recomeçado. Exige que
  // a frase INTEIRA seja a saudação: "Tudo bem delimitado, o escopo…" é conteúdo.
  /^(?:ola|oi|opa|e ai|bem-vind[oa]|tudo bem|como vai)(?:[,.!\s]|$)*$/,
];

/**
 * A frase é uma saudação/apresentação inicial? Comparada sem acentos: o `\b`
 * do JavaScript não trata "á" como letra, e "Olá, sou…" escapava do padrão.
 */
export function isGreetingSentence(sentence: string): boolean {
  const text = sentence.trim();
  if (!text || text.length > 180) return false;
  const plain = normalizeSentence(text);
  return GREETING_PATTERNS.some((re) => re.test(plain));
}

/** Normaliza uma frase para comparar igualdade (sem acento, pontuação ou caixa). */
export function normalizeSentence(sentence: string): string {
  return sentence
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A frase é uma fórmula de fecho vazia (clichê que trava a conversa)? */
export function isCloserSentence(sentence: string): boolean {
  const text = sentence.trim();
  if (!text) return false;
  // Um parágrafo longo e argumentativo não é clichê de fecho, mesmo que cite a
  // expressão de passagem.
  if (text.length > 160) return false;
  return CLOSER_PATTERNS.some((re) => re.test(text));
}

/**
 * Encheção de linguiça: frase que soa informativa mas não informa nada.
 *
 * No chat real o 8B respondeu "a literatura científica sugere que a influência
 * do vínculo institucional no método é um tema relevante e amplo, abordado em
 * diversas áreas do conhecimento, como psicologia, sociologia, ciência da
 * informação, entre outras". Nada disso responde à pergunta do pesquisador —
 * é o pior defeito visível, porque ocupa o lugar da resposta.
 *
 * Só barra frases GENÉRICAS: o que tem número, ano, autor, DOI ou termo
 * específico passa, mesmo que use "relevante".
 */
const FILLER_PATTERNS: RegExp[] = [
  /\btema (?:relevante|importante|amplo|complexo|abrangente|multidisciplinar|atual)\b/i,
  // `\b` não serve antes de "É": sem a flag /u o JS trata letra acentuada como
  // não-palavra, e "É um assunto complexo…" escapava do filtro.
  /(?:^|\s)(?:e|é) um (?:tema|assunto|campo|t[óo]pico|quest[ãa]o|discuss[ãa]o|debate)\b[^.!?]{0,60}\b(?:relevante|importante|amplo|complexo|vasto|abrangente|multidisciplinar|atual)\b/i,
  /\b(?:quest[ãa]o|discuss[ãa]o) (?:ampla|complexa|relevante|importante) e (?:relevante|ampla|complexa|importante)\b/i,
  /\babordad[oa] em (?:diversas|v[áa]rias|m[úu]ltiplas) (?:áreas|disciplinas|campos)\b/i,
  /\b(?:diversas|v[áa]rias|m[úu]ltiplas) (?:áreas|disciplinas) do conhecimento\b/i,
  /\bentre (?:outras|outros|elas|eles)\s*[.,]/i,
  /\ba literatura (?:cient[íi]fica )?(?:sugere|indica|aponta|mostra) que\b/i,
  /\b(?:tem|vem) (?:ganhado|ganhando|recebido) (?:crescente )?(?:destaque|aten[çc][ãa]o|import[âa]ncia)\b/i,
  /\b(?:no|neste) (?:contexto|cen[áa]rio) (?:atual|contempor[âa]neo)\b/i,
];

/** Marca de conteúdo CONCRETO: número, ano, DOI, citação de autor, aspas. */
const CONCRETE_RE =
  /\d{4}|\bdoi\b|10\.\d{4,}|\b[A-Z][a-z]+ \(\d{4}\)|["“”«»]|\b\d+(?:[.,]\d+)?%|\bp\.\s*\d+/i;

/**
 * A frase é encheção de linguiça? Só quando casa um padrão vago E não traz nada
 * concreto (ano, número, DOI, citação).
 */
export function isFillerSentence(sentence: string): boolean {
  const text = sentence.trim();
  if (!text) return false;
  // Frases longas que trazem um dado concreto são argumento, não encheção.
  if (CONCRETE_RE.test(text)) return false;
  return FILLER_PATTERNS.some((re) => re.test(text));
}

/** Frase com conteúdo suficiente para valer como "repetível". */
export function isSubstantive(norm: string): boolean {
  return norm.length >= 15;
}

type Piece = { sentence: string; sep: string };

/**
 * Separa o texto em frases completas (terminador + espaço/fim) e o resto ainda
 * em aberto. Ignora abreviações (`et al.`, `etc.`) para não cortar no meio.
 */
export function extractComplete(text: string): { parts: Piece[]; rest: string } {
  const parts: Piece[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === "." || ch === "!" || ch === "?" || ch === "…") {
      let j = i + 1;
      while (j < text.length && /["')\]»]/.test(text[j]!)) j += 1;
      const atEnd = j >= text.length;
      if (atEnd || /\s/.test(text[j]!)) {
        const sentence = text.slice(start, j);
        if (!ABBREVIATION_RE.test(sentence.trimEnd())) {
          let k = j;
          while (k < text.length && /\s/.test(text[k]!)) k += 1;
          parts.push({ sentence, sep: text.slice(j, k) });
          start = k;
          i = k;
          continue;
        }
      }
    }
    i += 1;
  }
  return { parts, rest: text.slice(start) };
}

/**
 * Decide o que fazer com um bloco de frases completas + o resto em aberto.
 * `seen` guarda as frases já ditas (é atualizado com o que for mantido).
 * Devolve o texto seguro a exibir.
 */
export function filterText(
  text: string,
  seen: Set<string>,
  remember: boolean,
  /** Falso a partir do 2º turno: saudação repetida é descartada. */
  allowGreeting = true,
): { safe: string; rest: string } {
  const { parts, rest } = extractComplete(text);
  const kept: Piece[] = [];
  const closers: Piece[] = [];
  const fillers: Piece[] = [];
  for (const piece of parts) {
    const norm = normalizeSentence(piece.sentence);
    if (isSubstantive(norm) && seen.has(norm)) continue; // repetição entre turnos
    if (!allowGreeting && isGreetingSentence(piece.sentence)) continue;
    // Encheção de linguiça sai antes dos clichês: ela não é fecho, é ruído no
    // meio da resposta ("é um tema relevante e amplo, abordado em diversas áreas").
    if (isFillerSentence(piece.sentence)) {
      fillers.push(piece);
      continue;
    }
    if (isCloserSentence(piece.sentence)) {
      closers.push(piece);
      continue;
    }
    kept.push(piece);
    // Marca já aqui para pegar repetições DENTRO da mesma mensagem.
    if (remember && isSubstantive(norm)) seen.add(norm);
  }
  // Sem conteúdo real, a encheção é liberada em vez de deixar a bolha vazia.
  const chosen = kept.length ? kept : closers.length ? closers : fillers;
  let safe = "";
  for (const piece of chosen) safe += piece.sentence + piece.sep;
  return { safe, rest };
}

/**
 * Versão para texto completo (histórico salvo / mensagens antigas): remove os
 * clichês de fecho quando há conteúdo, e as frases repetidas — sem zerar o texto.
 */
export function cleanAssistantText(text: string, seed?: Iterable<string>): string {
  const seedList = [...(seed ?? [])];
  const seen = new Set(seedList);
  const { safe, rest } = filterText(text, seen, true, seedList.length === 0);
  let out = safe;
  if (rest.trim()) {
    const norm = normalizeSentence(rest);
    if (!(isSubstantive(norm) && seen.has(norm))) out += rest;
  }
  return out.trim();
}

/**
 * Constrói o TransformStream do filtro (usado pelos testes e pelo adaptador).
 * Os clichês de fecho são retidos por id de texto: se o mesmo id trouxer depois
 * conteúdo substantivo, eles são descartados; se não, são liberados no fim (a
 * resposta nunca fica vazia).
 */
export function buildAntiRepeatStream(
  seedSentences: Iterable<string> = [],
): TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>> {
  const seedList = [...seedSentences];
  const seen = new Set(seedList);
  // Semente vazia = primeira mensagem da conversa: aí a apresentação é devida.
  // A partir do 2º turno ela é ruído, e precisa ser barrada AQUI — este stream é
  // o que o pesquisador vê na tela; limpar só o texto final (`cleanAssistantText`)
  // não impedia o "Olá, sou o Pracinha…" de aparecer no meio do diálogo.
  const allowGreeting = seedList.length === 0;
  const buffers = new Map<string, string>();
  const heldClosers = new Map<string, Piece[]>();
  const heldFillers = new Map<string, Piece[]>();
  const substantive = new Map<string, boolean>();
  return new TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>>({
    transform(part, controller) {
      if (part.type !== "text-delta") {
        controller.enqueue(part);
        return;
      }
      const buffer = (buffers.get(part.id) ?? "") + part.text;
      const { parts, rest } = extractComplete(buffer);
      buffers.set(part.id, rest);
      const closers = heldClosers.get(part.id) ?? [];
      const fillers = heldFillers.get(part.id) ?? [];
      let out = "";
      for (const piece of parts) {
        const norm = normalizeSentence(piece.sentence);
        if (isSubstantive(norm) && seen.has(norm)) continue;
        if (!allowGreeting && isGreetingSentence(piece.sentence)) continue;
        if (isCloserSentence(piece.sentence)) {
          closers.push(piece);
          continue;
        }
        if (isFillerSentence(piece.sentence)) {
          fillers.push(piece);
          continue;
        }
        out += piece.sentence + piece.sep;
        substantive.set(part.id, true);
        if (isSubstantive(norm)) seen.add(norm);
      }
      heldClosers.set(part.id, closers);
      heldFillers.set(part.id, fillers);
      if (out) controller.enqueue({ ...part, text: out });
    },
    flush(controller) {
      for (const [id, rest] of buffers) {
        const closers = heldClosers.get(id) ?? [];
        const fillers = heldFillers.get(id) ?? [];
        // Nada substantivo saiu para este id: libera o que ficou retido, para a
        // resposta nunca chegar vazia à tela.
        const head = substantive.get(id)
          ? ""
          : [...fillers, ...closers].map((p) => p.sentence + p.sep).join("");
        buffers.delete(id);
        heldClosers.delete(id);
        heldFillers.delete(id);
        substantive.delete(id);
        const text = head + rest;
        if (!text.trim()) continue;
        const norm = normalizeSentence(text);
        if (isSubstantive(norm) && seen.has(norm)) continue;
        if (!allowGreeting && isGreetingSentence(text)) continue;
        controller.enqueue({ type: "text-delta", id, text });
      }
    },
  });
}

/**
 * Adaptador no formato que o AI SDK espera em `experimental_transform`: uma
 * FUNÇÃO que devolve o TransformStream (e recebe os `tools`/`stopStream`).
 */
export function antiRepeatTransform(seedSentences: Iterable<string> = []) {
  const seed = [...seedSentences];
  return () => buildAntiRepeatStream(seed);
}

/** Texto de uma mensagem do modelo (string ou lista de partes). */
function messageText(message: ModelMessage): string {
  const content = message.content as unknown;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "type" in part) {
          const typed = part as { type?: unknown; text?: unknown };
          if (typed.type === "text") return String(typed.text ?? "");
        }
        return "";
      })
      .join(" ");
  }
  return "";
}

/**
 * Frases já ditas pelo assistente no histórico, normalizadas — servem de semente
 * para o filtro evitar repetir, entre turnos, uma pergunta que já foi feita.
 * Clichês de fecho NÃO entram na semente: eles têm regra própria (só são
 * descartados quando há conteúdo), e mantê-los aqui zeraria respostas curtas.
 */
export function collectAssistantSentences(messages: ModelMessage[]): string[] {
  const seen = new Set<string>();
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const { parts } = extractComplete(messageText(message));
    for (const { sentence } of parts) {
      if (isCloserSentence(sentence)) continue;
      const norm = normalizeSentence(sentence);
      if (isSubstantive(norm)) seen.add(norm);
    }
  }
  return [...seen];
}
