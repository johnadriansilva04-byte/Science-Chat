/**
 * Progresso da entrevista científica derivado das mensagens do chat. É uma
 * heurística transparente (não uma verdade absoluta): conta perguntas feitas pelo
 * assistente e respostas dadas pelo pesquisador, e extrai a etapa atual da marca
 * "_Etapa: ..._" que o prompt acrescenta ao final de cada mensagem.
 */
import {
  collectInterviewNotes,
  isQuestionToAssistant,
  sectionForQuestion,
} from "@/lib/interview-notes";

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
  // O ponto final não pode mudar o significado: "Pular." era contado como
  // resposta de conteúdo pelo progresso, enquanto `isNonContentAnswer` (que já
  // ignora pontuação) a tratava como pulo — os dois contadores discordavam.
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[.!…]+$/, "")
    .trim();
  return SKIP_PREFIXES.some((p) => normalized === p.toLowerCase());
}

/**
 * A ÚLTIMA pergunta do turno, ou `null` se não houver nenhuma.
 *
 * A pergunta pode estar no meio ("Qual é a sua tese? Fale sem pressa."): exigir
 * o "?" no fim da mensagem fazia o turno não contar como pergunta. Mas contar
 * DUAS perguntas no mesmo turno também é errado — o contador "x/y" mede turnos,
 * não frases interrogativas.
 */
export function lastQuestion(text: string): string | null {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const question = [...sentences].reverse().find((s) => s.trim().endsWith("?"));
  return question?.trim() ?? null;
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
      // Uma pergunta por mensagem basta — mas a pergunta não precisa ser a
      // ÚLTIMA frase. O modelo emenda "Qual é a sua tese? Fale à vontade." e,
      // exigindo o "?" no fim do turno, a mensagem não contava como pergunta e o
      // contador "1/4" ficava parado com a entrevista andando.
      if (lastQuestion(stripStage(text))) asked += 1;
    } else if (message.role === "user") {
      // Pergunta ao Pracinha não é resposta da entrevista: no chat real, quem
      // perguntava "posso submeter sem vínculo?" via o contador subir como se
      // tivesse respondido — e a etapa avançava sem a lacuna estar preenchida.
      if (isQuestionToAssistant(text)) continue;
      if (isSkipAnswer(text)) skipped += 1;
      else answered += 1;
    }
  }

  // O pesquisador pode mandar mais de uma mensagem por pergunta (ex.: cola um
  // texto longo, ou complementa a resposta). Sem este teto, o contador exibiria
  // "5/4" — respostas acima do número de perguntas feitas.
  const cappedSkipped = Math.min(skipped, asked);
  const cappedAnswered = Math.min(answered, Math.max(asked - cappedSkipped, 0));
  // O progresso é das SEÇÕES do artigo, não das mensagens. Com "respostas /
  // perguntas" ele chegava a 100% na segunda pergunta (2/2) e o trilho anunciava
  // a entrevista concluída antes de Metodologia, Resultados, Discussão e
  // Conclusão — o pesquisador via "Ignição 100%" e achava que tinha pulado
  // etapas. Uma seção conta quando recebeu resposta ou foi pulada.
  const filled = interviewMap(messages).filter(
    (item) => item.state === "answered" || item.state === "skipped",
  ).length;
  const ratio = filled / INTERVIEW_SECTIONS.length;
  return { asked, answered: cappedAnswered, skipped: cappedSkipped, ratio, stage };
}

/**
 * Etapa da entrevista derivada do CONTEÚDO, não de um marcador que a IA pode
 * esquecer. O prompt pede para o modelo encerrar cada turno com "_Etapa: …_",
 * mas o 8B frequentemente omite — e então o cabeçalho do chat ficava em
 * "assistente da ScienceChat" a entrevista inteira, sem dizer onde estamos.
 *
 * Aqui a etapa é a seção da ÚLTIMA pergunta feita: é o que a conversa está
 * interrogando naquele momento, e acompanha o documento ao vivo.
 */
export function interviewStage(messages: MessageLike[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || message.role !== "assistant") continue;
    // A etapa é a seção da última PERGUNTA do turno, não da última frase: o
    // modelo fecha com um comentário ("Fale sem pressa.") e a etapa ficava
    // nula, deixando o cabeçalho em "assistente da ScienceChat".
    const question = lastQuestion(stripStage(messageText(message)));
    if (!question) continue;
    const section = sectionForQuestion(question);
    // Turno que só apresenta o retorno da busca não é uma etapa do artigo:
    // seguir para a pergunta anterior mantém o cabeçalho na seção real, em vez
    // de anunciar "Etapa: Outras informações".
    if (section === "Outras informações") continue;
    return section;
  }
  return null;
}

/** Seções do artigo na ordem em que o documento é montado. */
export const INTERVIEW_SECTIONS = [
  "Introdução",
  "Fundamentação teórica",
  "Metodologia",
  "Resultados",
  "Discussão",
  "Conclusão",
] as const;

export type SectionState = "answered" | "current" | "open" | "skipped";

/**
 * Mapa da entrevista: quais seções do artigo já têm resposta do pesquisador.
 *
 * A folha ao lado mostra o texto, mas não diz o que FALTA — e o pesquisador não
 * tinha como saber se a entrevista estava no começo ou quase no fim. Aqui cada
 * seção recebe um estado: `answered` (já tem conteúdo), `current` (é a que está
 * sendo perguntada agora), `skipped` (ele pulou) e `open` (ainda sem resposta).
 *
 * Pular não preenche a seção, mas também não é "em aberto": o guard não volta a
 * perguntar. Mostrar "em aberto" para uma seção que a entrevista já abandonou
 * deixava a faixa mentindo sobre o que falta.
 */
export function interviewMap(messages: MessageLike[]): { section: string; state: SectionState }[] {
  const answered = new Set<string>();
  const skipped = new Set<string>();
  for (const note of collectInterviewNotes(messages)) {
    // Turno em que o pesquisador PERGUNTOU não preenche nem pula a seção: a
    // lacuna segue aberta. Antes ele vinha com `skipped` (o mesmo marcador de
    // "Pular") e a faixa anunciava a seção como resolvida — inflando o
    // progresso com perguntas em vez de respostas.
    if (isQuestionToAssistant(note.answer)) continue;
    const section = note.section ?? sectionForQuestion(note.question);
    if (note.skipped) skipped.add(section);
    else answered.add(section);
  }
  const current = interviewStage(messages);
  return INTERVIEW_SECTIONS.map((section) => ({
    section,
    state: answered.has(section)
      ? "answered"
      : skipped.has(section)
        ? "skipped"
        : section === current
          ? "current"
          : "open",
  }));
}
