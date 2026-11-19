/**
 * Garantia de que a ENTREVISTA sempre avance.
 *
 * Defeito observado no chat real: quando o pesquisador cola um texto longo (a
 * metodologia, a hipótese, as evidências), o llama-3.3 responde parafraseando o
 * que leu — "Você está propondo uma abordagem metodológica rigorosa…" — e NÃO
 * faz pergunta. O diálogo morre ali: o pesquisador escreve, o Pracinha repete,
 * nada é acrescentado. Pedir no prompt não resolve; o vício volta com histórico
 * longo.
 *
 * Este módulo é a rede de segurança determinística: se a resposta da entrevista
 * não pergunta nada, acrescentamos a pergunta da próxima lacuna REAL (a primeira
 * seção ainda sem resposta). É puro, sem I/O, para ser testado e reaplicado no
 * stream e no texto final.
 */

import type { TextStreamPart, ToolSet } from "ai";
import { interviewNotes, sectionForQuestion, type InterviewNote } from "@/lib/interview-notes";

type MessageLike = { role: string; parts: { type: string; text?: string }[] };

/** Perguntas de abertura de cada lacuna, na ordem em que a entrevista anda. */
const GAP_QUESTIONS: { section: string; question: string }[] = [
  {
    section: "Introdução",
    question:
      "Para eu fechar o problema: qual é a pergunta central que o artigo quer responder, em uma frase?",
  },
  {
    section: "Fundamentação teórica",
    question:
      "Quais autores ou teorias sustentam essa ideia — e qual é a objeção mais forte que você já ouviu contra ela?",
  },
  {
    section: "Metodologia",
    question:
      "Como você vai demonstrar isso: quais materiais, procedimentos ou critérios de análise vai usar?",
  },
  {
    section: "Resultados",
    question:
      "O que você já tem de resultado ou evidência concreta — e o que ainda falta levantar?",
  },
  {
    section: "Discussão",
    question:
      "O que muda na área se a sua tese estiver certa — e qual é o limite mais honesto dela?",
  },
  {
    section: "Conclusão",
    question: "Fechando: qual é a conclusão que você quer que o leitor leve embora?",
  },
];

/** Pergunta de aprofundamento quando todas as seções já têm alguma resposta. */
const DEEPEN_QUESTION =
  "Qual é a afirmação do seu texto que você considera mais frágil hoje — e o que a tornaria mais sólida?";

/** Seções que já receberam resposta do pesquisador. */
export function answeredSections(notes: InterviewNote[]): Set<string> {
  const sections = new Set<string>();
  for (const note of notes) sections.add(sectionForQuestion(note.question));
  return sections;
}

/**
 * Próxima pergunta da entrevista: a da primeira lacuna ainda aberta, ou a de
 * aprofundamento quando nada está em falta.
 */
export function nextInterviewQuestion(notes: InterviewNote[]): string {
  const answered = answeredSections(notes);
  const gap = GAP_QUESTIONS.find((item) => !answered.has(item.section));
  return gap?.question ?? DEEPEN_QUESTION;
}

/** A resposta já pergunta algo? Basta um "?" em qualquer posição. */
function asksSomething(text: string): boolean {
  return text.includes("?");
}

/**
 * A resposta está no protocolo de fechamento (recapitulação + estrutura +
 * convite a concluir)? Ali a pergunta de entrevista seria intrusa: o caminho é
 * clicar em "Concluir entrevista".
 */
function isClosingProtocol(text: string): boolean {
  return /concluir entrevista|montar o plano|protocolo de trabalho/i.test(text);
}

/**
 * Devolve o texto da entrevista com a pergunta da próxima lacuna quando ele não
 * pergunta nada. Nunca devolve vazio: se o texto vier em branco, devolve só a
 * pergunta.
 */
export function ensureInterviewQuestion(text: string, notes: InterviewNote[]): string {
  const body = text.trim();
  if (body && (asksSomething(body) || isClosingProtocol(body))) return body;
  const question = nextInterviewQuestion(notes);
  return body ? `${body}\n\n${question}` : question;
}

/** Conveniência: deriva as notas do histórico e aplica a garantia. */
export function ensureInterviewQuestionFromHistory(text: string, messages: MessageLike[]): string {
  return ensureInterviewQuestion(text, interviewNotes(messages));
}

/**
 * Transform de stream: deixa o texto passar ao vivo e, no fim, acrescenta a
 * pergunta da próxima lacuna se a resposta não perguntou nada. Anexar no fim
 * (e não no meio) mantém a leitura fluida e não atrasa a exibição.
 */
export function interviewQuestionTransform(
  notes: InterviewNote[],
): TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>> {
  let seen = "";
  let lastId = "";
  return new TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>>({
    transform(part, controller) {
      if (part.type === "text-delta") {
        seen += part.text;
        lastId = part.id;
      }
      controller.enqueue(part);
    },
    flush(controller) {
      const body = seen.trim();
      if (body && (asksSomething(body) || isClosingProtocol(body))) return;
      const question = nextInterviewQuestion(notes);
      if (!lastId) {
        // O modelo gastou todos os passos em ferramentas e não escreveu NADA —
        // o pesquisador via uma bolha vazia. A pergunta vira a resposta.
        const id = `interview-guard-${crypto.randomUUID()}`;
        controller.enqueue({ type: "text-start", id });
        controller.enqueue({ type: "text-delta", id, text: question });
        controller.enqueue({ type: "text-end", id });
        return;
      }
      controller.enqueue({ type: "text-delta", id: lastId, text: `\n\n${question}` });
    },
  });
}
