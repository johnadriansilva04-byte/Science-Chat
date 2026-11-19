/**
 * Extrai da entrevista os pares pergunta/resposta que alimentam a prévia ao vivo
 * no papel A4. O objetivo é mostrar, durante a entrevista, o que o pesquisador já
 * informou — sem redigir o artigo (isso só começa após a aprovação do plano).
 */
export type InterviewNote = { question: string; answer: string };

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
    ],
  },
  {
    section: "Resultados",
    words: ["result", "análise", "analise", "achado", "experiment", "medid"],
  },
  { section: "Discussão", words: ["discuss", "interpreta", "signific"] },
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

/** Agrupa as notas da entrevista por seção, na ordem canônica. */
export function groupNotesBySection(
  notes: InterviewNote[],
): { section: string; notes: InterviewNote[] }[] {
  const map = new Map<string, InterviewNote[]>();
  for (const note of notes) {
    const section = sectionForQuestion(note.question);
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

export function interviewNotes(messages: MessageLike[]): InterviewNote[] {
  const notes: InterviewNote[] = [];
  let lastQuestion = "";
  for (const message of messages) {
    const text = messageText(message);
    if (!text) continue;
    if (message.role === "assistant") {
      const q = cleanQuestion(text);
      if (q.endsWith("?")) lastQuestion = q;
    } else if (message.role === "user") {
      // Pedido de ação não é resposta de entrevista: consumir a pergunta sem
      // gravar o comando, para ele não aparecer como conteúdo do artigo.
      if (isDocumentCommand(text)) {
        lastQuestion = "";
        continue;
      }
      notes.push({ question: lastQuestion || "Informação fornecida", answer: text });
      lastQuestion = "";
    }
  }
  return notes;
}
