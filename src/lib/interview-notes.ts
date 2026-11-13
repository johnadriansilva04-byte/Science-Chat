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
  const chosen = lastQuestion ?? sentences[sentences.length - 1] ?? withoutProgress;
  return chosen
    .replace(/^[-*•]\s*/, "")
    .trim()
    .slice(0, 200);
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
  { section: "Conclusão", words: ["conclus", "considera", "fechamento"] },
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
      notes.push({ question: lastQuestion || "Informação fornecida", answer: text });
      lastQuestion = "";
    }
  }
  return notes;
}
