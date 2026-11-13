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
  return chosen.replace(/^[-*•]\s*/, "").trim().slice(0, 200);
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
