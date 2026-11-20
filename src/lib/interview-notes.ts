/**
 * Extrai da entrevista os pares pergunta/resposta que alimentam a prévia ao vivo
 * no papel A4. O objetivo é mostrar, durante a entrevista, o que o pesquisador já
 * informou — sem redigir o artigo (isso só começa após a aprovação do plano).
 */
export type InterviewNote = {
  question: string;
  answer: string;
  /** Seção do artigo, quando já classificada pelo turno inteiro da IA. */
  section?: string;
  /**
   * A resposta não é conteúdo: pulo ("Pular"), continuação ("Continuar") ou
   * pergunta do próprio pesquisador. A nota existe para a entrevista saber que a
   * lacuna foi tratada, mas não pode virar parágrafo do artigo.
   */
  skipped?: boolean;
};

type MessageLike = { role: string; parts: { type: string; text?: string }[] };

function messageText(message: MessageLike): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join(" ")
    .trim();
}

/** Remove a linha de progresso ("_Etapa: ..._") e isola a última pergunta. */
export function cleanQuestion(text: string): string {
  const withoutProgress = text
    .split("\n")
    .filter((line) => !/^\s*_?Etapa:/i.test(line.trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = withoutProgress.split(/(?<=[.?!])\s+/);
  const lastQuestion = [...sentences].reverse().find((s) => s.trim().endsWith("?"));
  const chosen = (lastQuestion ?? sentences[sentences.length - 1] ?? withoutProgress)
    .replace(/^[-*•]\s*/, "")
    .trim();
  // Perguntas longas são comuns ("...você considerou...?"). Um corte cru em 200
  // caracteres arrancava o "?" final, e o par pergunta/resposta da entrevista
  // deixava de ser reconhecido (a nota caía em "Informação fornecida"). Ao
  // truncar, preservamos o "?" para o pareamento continuar valendo.
  const MAX = 300;
  if (chosen.length <= MAX) return chosen;
  const isQuestion = chosen.endsWith("?");
  const clipped = chosen.slice(0, isQuestion ? MAX - 1 : MAX).trimEnd();
  return isQuestion ? `${clipped}?` : `${clipped}…`;
}

/** Ordem canônica das seções do documento preliminar. */
export const SECTION_ORDER = [
  "Resumo",
  "Introdução",
  "Fundamentação teórica",
  "Metodologia",
  "Resultados",
  "Discussão",
  "Conclusão",
  "Referências",
  "Outras informações",
];

// Classificação por palavra-chave da pergunta → seção do artigo. A ordem importa:
// a primeira regra que casar vence (ex.: "resultados" antes de "dados").
const SECTION_RULES: { section: string; words: string[] }[] = [
  { section: "Resumo", words: ["resumo", "abstract", "palavras-chave", "palavras chave"] },
  {
    section: "Fundamentação teórica",
    words: [
      "teori",
      "fundamenta",
      "autor",
      "conceit",
      "referencial",
      "literatura",
      "debate",
      "corrente",
      "obra",
    ],
  },
  {
    section: "Metodologia",
    words: [
      "metod",
      "métod",
      "procediment",
      "amostra",
      "coleta",
      "instrumento",
      "variáv",
      "variav",
      "método",
      "metodo",
      "dados",
      "materi",
      "corpus",
      "entrevista",
      "questionário",
      "questionario",
    ],
  },
  {
    section: "Resultados",
    words: ["result", "análise", "analise", "achado", "experiment", "medid"],
  },
  // "tese" e "tema" são sinais de Introdução, mas a pergunta de Discussão da
  // entrevista ("o que muda na área se a sua tese estiver certa…") também diz
  // "tese" e caía em Introdução — o cabeçalho ficava parado na etapa 1 a
  // entrevista inteira. "muda na" e "implic" vêm antes por serem específicos.
  { section: "Discussão", words: ["discuss", "interpreta", "signific", "muda na", "implic"] },
  // "considera" sozinho casa com "considerar" em perguntas comuns ("como você
  // pode considerar...") e jogava a resposta na Conclusão. Só "consideraç"
  // (considerações finais) é sinal real de conclusão.
  { section: "Conclusão", words: ["conclus", "consideraç", "fechamento"] },
  { section: "Referências", words: ["referênc", "referenc", "fonte", "bibliograf"] },
  {
    section: "Introdução",
    words: [
      "introdu",
      "contexto",
      "tema",
      "justificativa",
      "problema",
      "pergunta",
      "questão",
      "objetivo",
      "tese",
      "hipótese",
      "contribui",
      "assunto",
    ],
  },
];

/** Seção do artigo à qual uma pergunta da entrevista pertence. */
export function sectionForQuestion(question: string): string {
  const q = question.toLowerCase();
  for (const rule of SECTION_RULES) {
    if (rule.words.some((w) => q.includes(w))) return rule.section;
  }
  return "Outras informações";
}

/**
 * Seção de um TURNO do assistente, não só da última frase.
 *
 * Defeito real: o Pracinha perguntou "Para eu fechar o problema: qual é a
 * pergunta central?" e, na mesma mensagem, "Agora, você tem um ORCID?". O
 * `cleanQuestion` guarda só a última pergunta, e a resposta do pesquisador
 * (a tese dele) ia para "Outras informações" na folha — o documento aparecia
 * desalinhado da conversa.
 *
 * Aqui a classificação olha o turno inteiro e fica com a primeira pergunta que
 * nomeia uma seção de conteúdo; perguntas de identificação (ORCID, nome,
 * afiliação) só valem se não houver nenhuma outra.
 */
export function sectionForTurn(text: string): string {
  const questions = text
    .split(/(?<=[.?!])\s+/)
    .filter((s) => s.trim().endsWith("?"))
    .map((s) => s.trim());
  for (const q of questions) {
    const section = sectionForQuestion(q);
    if (section !== "Outras informações") return section;
  }
  return "Outras informações";
}

/**
 * Seção da nota: a da pergunta que o pesquisador REALMENTE respondeu.
 *
 * O guard pode emendar a pergunta da próxima lacuna no fim de um turno do modelo
 * ("O que muda na área…" + "Fechando: qual é a conclusão…"). O pesquisador
 * responde a ÚLTIMA, mas `sectionForTurn` devolvia a seção da primeira — e a
 * conclusão dele era gravada na Discussão da folha.
 *
 * A última pergunta vence quando nomeia uma seção de conteúdo; se ela for de
 * identificação (ORCID, nome, afiliação), vale o turno inteiro — é o caso que
 * `sectionForTurn` existe para resolver.
 */
export function sectionForAnswer(question: string, turn: string): string {
  const direct = sectionForQuestion(question);
  if (direct !== "Outras informações") return direct;
  return sectionForTurn(turn);
}

/** Agrupa as notas da entrevista por seção, na ordem canônica. */
export function groupNotesBySection(
  notes: InterviewNote[],
): { section: string; notes: InterviewNote[] }[] {
  const map = new Map<string, InterviewNote[]>();
  for (const note of notes) {
    const section = note.section ?? sectionForQuestion(note.question);
    const list = map.get(section);
    if (list) list.push(note);
    else map.set(section, [note]);
  }
  return SECTION_ORDER.filter((s) => map.has(s)).map((section) => ({
    section,
    notes: map.get(section)!,
  }));
}

/**
 * Comando sobre o documento, não conteúdo para ele: "arrume o título para X",
 * "reescreva a página 2", "publique". Sem este filtro, todo pedido do pesquisador
 * virava parágrafo da prévia — e a introdução aparecia com "arrume o titulo para
 * O Autodidata e seus Métodos" três vezes dentro do texto.
 */
const COMMAND_PATTERNS = [
  /\b(?:arrume|arruma|consert\w*|corrij\w*|corrig\w*|mude|muda|troque|troca|altere|alter\w*|atualiz\w*|renomeie|defina)\b[^.!?]{0,60}\bt[íi]tulo\b/,
  /\b(?:reescrev\w*|refa[çz]\w*|melhore|melhorar|revise|revisar|encurt\w*|apague|remova|exclua)\b[^.!?]{0,60}\b(?:p[áa]gina|se[çc][ãa]o|trecho|par[áa]grafo)\b/,
  /\b(?:publique|publicar|exporte|exportar|gere o pdf|baixe)\b\s*(?:o\s+artigo|agora|j[áa])?\s*$/,
];

/** O texto é um comando sobre o documento (e não material para ele)? */
export function isDocumentCommand(text: string): boolean {
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return false;
  // Comando é curto; um parágrafo de pesquisa nunca é.
  if (t.length > 200) return false;
  return COMMAND_PATTERNS.some((re) => re.test(t));
}

/**
 * Respostas que NÃO são conteúdo do artigo.
 *
 * No histórico real o pesquisador respondeu "Continuar" e "Pular" para avançar a
 * entrevista, e o documento exibiu esses parágrafos dentro das seções. Também
 * aconteceu de ele fazer a própria pergunta ("Posso submeter um artigo sem vínculo
 * institucional?") e essa pergunta virar parágrafo da Introdução.
 *
 * A nota continua existindo: a entrevista precisa saber que a lacuna foi tratada
 * para não repetir a pergunta. Só não pode virar texto do artigo.
 */
const NON_CONTENT_ANSWERS = new Set([
  "pular",
  "pula",
  "continuar",
  "continua",
  "continue",
  "proximo",
  "proxima",
  "seguir",
  "pode seguir",
  "pode continuar",
  "ok",
  "certo",
  "sim",
  "nao",
  "nao sei",
  "nao se aplica",
  "ainda nao sei",
  "quero responder depois",
]);

export function isNonContentAnswer(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  const plain = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.!]+$/, "")
    .trim();
  if (NON_CONTENT_ANSWERS.has(plain)) return true;
  // Pergunta curta é dirigida ao Pracinha, não material do artigo.
  return isQuestionToAssistant(t);
}

/**
 * O pesquisador usou o turno para PERGUNTAR, não para responder.
 *
 * Diferente de pular: a lacuna continua aberta. Se a pergunta contasse como
 * resposta, o guard marcaria a seção como preenchida e o artigo seguiria sem ela.
 *
 * Antes bastava terminar com "?" — e uma resposta legítima escrita nessa forma
 * ("A pergunta central é se um pesquisador sem vínculo consegue publicar?") era
 * descartada: a seção ficava eternamente aberta e o guard repetia a mesma
 * pergunta a cada turno. Agora o turno que COMEÇA declarando o conteúdo do
 * trabalho é resposta, mesmo terminando em "?".
 */
const ANSWER_LEAD =
  /^(a pergunta|a tese|a hipotese|minha tese|minha hipotese|o objetivo|meu objetivo|o tema|meu tema|o problema|meu problema|a justificativa|a conclusao|minha conclusao|o metodo|a metodologia|minha metodologia|o argumento|meu argumento|a ideia|minha ideia|a proposta|minha proposta|o artigo|meu artigo|a pesquisa|minha pesquisa|o estudo|meu estudo|o resumo|a amostra|minha amostra|os dados|meus dados|os resultados|meus resultados)\b/;

export function isQuestionToAssistant(text: string): boolean {
  const t = text.trim();
  if (!t.endsWith("?") || t.length > 200) return false;
  const plain = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (ANSWER_LEAD.test(plain)) return false;
  return true;
}

/**
 * Notas SEM poda de repetição.
 *
 * A poda (`dedupeNotes`) existe para a FOLHA não mostrar o mesmo parágrafo três
 * vezes. Mas quem decide a próxima pergunta da entrevista também lê estas notas —
 * e ali a repetição importa: quando o pesquisador reenvia a mesma resposta, a
 * seção foi respondida do mesmo jeito. Podada, ela continuava "em aberto" e o
 * guard repetia a MESMA pergunta para sempre (aconteceu no chat real: sete turnos
 * seguidos com "O que muda na área se a sua tese estiver certa…").
 */
export function collectInterviewNotes(messages: MessageLike[]): InterviewNote[] {
  const notes: InterviewNote[] = [];
  let lastQuestion = "";
  let lastTurn = "";
  let sawAssistant = false;
  for (const message of messages) {
    const text = messageText(message);
    if (!text) continue;
    if (message.role === "assistant") {
      sawAssistant = true;
      const q = cleanQuestion(text);
      if (q.endsWith("?")) {
        lastQuestion = q;
        // O turno inteiro fica guardado: a classificação por seção precisa dele
        // (ver `sectionForTurn`), e a nota exibida continua sendo só a pergunta.
        lastTurn = text;
      }
    } else if (message.role === "user") {
      // Pedido de ação não é resposta de entrevista: consumir a pergunta sem
      // gravar o comando, para ele não aparecer como conteúdo do artigo.
      if (isDocumentCommand(text)) {
        lastQuestion = "";
        lastTurn = "";
        continue;
      }
      // Antes de qualquer fala do Pracinha só existe o texto-semente — o título
      // que o pesquisador digitou na home, já exibido como H1. Gravá-lo criava
      // uma seção "Outras informações" com o título repetido dentro dela.
      if (!sawAssistant) continue;
      const section = lastTurn ? sectionForAnswer(lastQuestion, lastTurn) : undefined;
      const skipped = isNonContentAnswer(text);
      notes.push({
        question: lastQuestion || "Informação fornecida",
        answer: text,
        ...(section ? { section } : {}),
        ...(skipped ? { skipped: true } : {}),
      });
      lastQuestion = "";
      lastTurn = "";
    }
  }
  return notes;
}

/** Notas prontas para exibição: sem respostas repetidas e sem pulos/comandos. */
export function interviewNotes(messages: MessageLike[]): InterviewNote[] {
  return dedupeNotes(collectInterviewNotes(messages)).filter((note) => !note.skipped);
}

/** Chave de comparação: sem acento, pontuação, caixa nem espaço repetido. */
function noteKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Descarta respostas repetidas. O pesquisador reenvia a mesma resposta quando a
 * IA falha ou demora (aconteceu no chat real: a mesma frase três vezes no banco),
 * e sem esta poda a folha mostrava o mesmo parágrafo três vezes seguidas — o
 * "documento desincronizado" que o pesquisador via.
 *
 * Só remove repetição CONSECUTIVA e idêntica (ignorando acento/caixa): respostas
 * diferentes sobre a mesma pergunta continuam sendo notas distintas.
 */
export function dedupeNotes(notes: InterviewNote[]): InterviewNote[] {
  const out: InterviewNote[] = [];
  let previous = "";
  for (const note of notes) {
    const key = noteKey(note.answer);
    // Resposta vazia ou trivial ("ok", "sim") não vira parágrafo do artigo.
    if (!key || key === previous) continue;
    if (key.length < 3 && out.length > 0) continue;
    previous = key;
    out.push(note);
  }
  return out;
}
