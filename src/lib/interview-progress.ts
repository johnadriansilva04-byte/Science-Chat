/**
 * Progresso da entrevista científica derivado das mensagens do chat. É uma
 * heurística transparente (não uma verdade absoluta): conta perguntas feitas pelo
 * assistente e respostas dadas pelo pesquisador, e extrai a etapa atual da marca
 * "_Etapa: ..._" que o prompt acrescenta ao final de cada mensagem.
 */
export type MessageLike = { role: string; parts: { type: string; text?: string }[] };

export type InterviewProgress = {
  asked: number;
  answered: number;
  skipped: number;
  ratio: number;
  stage: string | null;
};

const SKIP_PREFIXES = ["Pular", "Não se aplica", "Ainda não sei", "Quero responder depois"];

export function messageText(message: MessageLike): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join(" ")
    .trim();
}

export function extractStage(text: string): string | null {
  const match = text.match(/_?Etapa:\s*([^_\n]+)_?/i);
  return match?.[1]?.trim() ?? null;
}

/** Remove a marca de etapa (_Etapa: ..._) que o prompt acrescenta ao final. */
export function stripStage(text: string): string {
  return text.replace(/_?\s*Etapa:\s*[^_\n]+_?/gi, "").trim();
}

export function isSkipAnswer(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return SKIP_PREFIXES.some((p) => normalized === p.toLowerCase());
}

export function interviewProgress(messages: MessageLike[]): InterviewProgress {
  let asked = 0;
  let answered = 0;
  let skipped = 0;
  let stage: string | null = null;

  for (const message of messages) {
    const text = messageText(message);
    if (!text) continue;
    if (message.role === "assistant") {
      const s = extractStage(text);
      if (s) stage = s;
      const lastSentence =
        stripStage(text)
          .split(/(?<=[.?!])\s+/)
          .pop() ?? "";
      if (lastSentence.trim().endsWith("?")) asked += 1;
    } else if (message.role === "user") {
      if (isSkipAnswer(text)) skipped += 1;
      else answered += 1;
    }
  }

  const denominator = Math.max(asked, 1);
  const ratio = asked === 0 ? 0 : Math.min(1, (answered + skipped) / denominator);
  return { asked, answered, skipped, ratio, stage };
}
