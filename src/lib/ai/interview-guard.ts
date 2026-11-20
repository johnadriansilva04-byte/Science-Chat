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
import {
  collectInterviewNotes,
  isQuestionToAssistant,
  sectionForQuestion,
  type InterviewNote,
} from "@/lib/interview-notes";

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

/**
 * Perguntas de aprofundamento, usadas quando todas as seções já têm resposta.
 *
 * Uma só não bastava: respondida a última lacuna, o guard passava a devolver a
 * MESMA pergunta em todo turno (o histórico real tem sete turnos seguidos com a
 * mesma frase). Aqui a lista anda para a frente, como as lacunas.
 */
const DEEPEN_QUESTIONS = [
  "Qual é a afirmação do seu texto que você considera mais frágil hoje — e o que a tornaria mais sólida?",
  "Que evidência, se aparecesse amanhã, faria você mudar de conclusão?",
  "Qual é o limite do seu estudo que o leitor precisa conhecer antes de confiar no resultado?",
  "Se um parecerista discordasse da sua interpretação, qual seria o argumento dele — e como você responderia?",
  "Quem mais precisa ler este artigo — e o que essa pessoa faria diferente depois de ler?",
  "Que parte do seu texto ainda depende de uma suposição que você não testou?",
];

/**
 * Seções que já receberam resposta do pesquisador.
 *
 * Classifica a pergunta EXIBIDA (`note.question`, a última do turno — a que o
 * pesquisador realmente respondeu), não o turno inteiro. Quando o guard anexa a
 * pergunta dele a um turno do modelo, `sectionForTurn` fica com a PRIMEIRA
 * pergunta do turno e marcava a lacuna errada como respondida: a pergunta
 * exibida continuava "aberta" e voltava em todo turno, para sempre.
 *
 * Turno em que o pesquisador PERGUNTOU não fecha lacuna nenhuma: ele quer saber
 * algo antes de responder, e dar a seção por preenchida deixaria o artigo sem
 * ela. Pular ("Pular", "Ainda não sei") fecha, porque aí ele decidiu não ter.
 */
export function answeredSections(notes: InterviewNote[]): Set<string> {
  const sections = new Set<string>();
  for (const note of notes) {
    if (isQuestionToAssistant(note.answer)) continue;
    sections.add(sectionForQuestion(note.question));
  }
  return sections;
}

/**
 * Próxima pergunta da entrevista: a da primeira lacuna ainda aberta, ou a de
 * aprofundamento quando nada está em falta.
 *
 * Duas correções vieram do histórico real:
 *
 * 1. A pergunta já feita não volta enquanto houver lacuna NOVA para abrir. O
 *    pesquisador respondeu com uma pergunta ("Posso submeter sem vínculo?") e o
 *    guard devolveu "O que muda na área…" seis vezes seguidas, sempre na mesma
 *    lacuna.
 * 2. Quando TODAS as lacunas abertas já foram perguntadas, a vez é da que foi
 *    perguntada menos vezes — a entrevista alterna em vez de fixar na primeira.
 *
 * Esgotado tudo, o guard PARA de perguntar e convida a concluir. Antes repetia a
 * última pergunta de aprofundamento para sempre e a entrevista nunca fechava.
 */
export function nextInterviewQuestion(notes: InterviewNote[]): string {
  const answered = answeredSections(notes);
  const asked = new Map<string, number>();
  for (const note of notes) {
    const key = comparable(note.question);
    asked.set(key, (asked.get(key) ?? 0) + 1);
  }
  const timesAsked = (question: string) => asked.get(comparable(question)) ?? 0;

  const open = GAP_QUESTIONS.filter((item) => !answered.has(item.section));
  // Respeita a ORDEM das lacunas: a primeira ainda aberta é a vez dela, mesmo que
  // já tenha sido perguntada. Antes o guard pulava para a próxima lacuna "nunca
  // perguntada" — quando o pesquisador respondia com outra pergunta (a lacuna
  // segue aberta, mas a pergunta já foi feita), a Metodologia era abandonada e a
  // entrevista ia direto para os Resultados.
  const next = open.find((item) => timesAsked(item.question) < MAX_ASKS);
  if (next) return next.question;

  const deepen = DEEPEN_QUESTIONS.filter((question) => timesAsked(question) === 0);
  if (deepen.length) return deepen[0]!;
  return CLOSING_INVITE;
}

/** Fim da linha: nada novo a perguntar, então o caminho é concluir. */
const CLOSING_INVITE =
  "Já tenho o essencial da sua pesquisa. Se quiser acrescentar algo, escreva aqui; quando terminar, clique em “Concluir entrevista e montar o plano”.";

/**
 * Quantas vezes a MESMA pergunta pode voltar antes de o guard desistir dela.
 *
 * Duas: a primeira é a pergunta; a segunda cobre o caso de o pesquisador ter
 * desviado (perguntou algo, mandou um comando no documento). A partir daí insistir
 * só irrita — o histórico real tem seis repetições seguidas da mesma frase.
 */
const MAX_ASKS = 2;

/** Texto comparável: sem acento, pontuação, caixa nem espaço repetido. */
function comparable(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A resposta já pergunta algo? Basta um "?" em qualquer posição. */
function asksSomething(text: string): boolean {
  return text.includes("?");
}

/** Perguntas de identificação: não abrem seção de conteúdo do artigo. */
const IDENTITY_QUESTION_RE =
  /\b(?:orcid|seu nome|nome completo|institui[çc][ãa]o|vinculo|v[íi]nculo|filia[çc][ãa]o|afilia[çc][ãa]o|lattes)\b/i;

/**
 * Deixa só UMA pergunta no fim do turno.
 *
 * O modelo emendava duas ("qual é a pergunta central?" + "você tem ORCID?"). O
 * pesquisador responde só a última, e a resposta da tese caía na seção errada da
 * folha. Aqui a pergunta de CONTEÚDO é preservada e a de identificação vai para o
 * turno seguinte — a conversa não perde a informação, só a ordena.
 */
export function singleQuestion(text: string): string {
  const parts = text.split(/(?<=[.?!])\s+/);
  const questions = parts.filter((s) => s.trim().endsWith("?"));
  if (questions.length <= 1) return text;
  const content = questions.filter((q) => !IDENTITY_QUESTION_RE.test(q));
  const keep = content[0] ?? questions[0]!;
  const out: string[] = [];
  let keptOne = false;
  for (const sentence of parts) {
    const isQuestion = sentence.trim().endsWith("?");
    if (!isQuestion) {
      out.push(sentence);
      continue;
    }
    if (!keptOne && sentence === keep) {
      out.push(sentence);
      keptOne = true;
    }
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
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
  const body = singleQuestion(text.trim());
  if (body && (asksSomething(body) || isClosingProtocol(body))) return body;
  const question = nextInterviewQuestion(notes);
  return body ? `${body}\n\n${question}` : question;
}

/** Conveniência: deriva as notas do histórico e aplica a garantia. */
export function ensureInterviewQuestionFromHistory(text: string, messages: MessageLike[]): string {
  return ensureInterviewQuestion(text, collectInterviewNotes(messages));
}

/**
 * Transform de stream: deixa o texto passar ao vivo e, no fim, acrescenta a
 * pergunta da próxima lacuna se a resposta não perguntou nada. Anexar no fim
 * (e não no meio) mantém a leitura fluida e não atrasa a exibição.
 *
 * Também derruba, AO VIVO, a segunda pergunta de identificação do turno. O modelo
 * escrevia "qual é a pergunta central?" e, em seguida, "você tem ORCID?"; o
 * pesquisador respondia a tese, que então era pareada com a pergunta de ORCID e
 * caía na seção errada da folha. Só a pergunta de identidade que vem DEPOIS de
 * outra pergunta é suprimida — nunca a primeira, nunca o conteúdo.
 */
export function interviewQuestionTransform(
  notes: InterviewNote[],
): TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>> {
  let seen = "";
  let lastId = "";
  let pending = "";
  let questionsEmitted = 0;

  const emit = (
    controller: TransformStreamDefaultController<TextStreamPart<ToolSet>>,
    text: string,
  ) => {
    if (!text) return;
    controller.enqueue({ type: "text-delta", id: lastId, text });
  };

  return new TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>>({
    transform(part, controller) {
      if (part.type !== "text-delta") {
        controller.enqueue(part);
        return;
      }
      lastId = part.id;
      seen += part.text;
      pending += part.text;
      // Emite frases fechadas; segura a última (ainda em aberto) para decidir.
      for (;;) {
        const match = pending.match(/[.?!](?:["')\]»])*(?=\s|$)/);
        if (!match || match.index === undefined) break;
        const end = match.index + match[0].length;
        const chunk = pending.slice(0, end);
        pending = pending.slice(end);
        const isQuestion = match[0].startsWith("?");
        if (isQuestion && questionsEmitted >= 1 && IDENTITY_QUESTION_RE.test(chunk)) {
          continue; // pergunta de identidade que roubaria a resposta
        }
        if (isQuestion) questionsEmitted += 1;
        emit(controller, chunk);
      }
    },
    flush(controller) {
      emit(controller, pending);
      pending = "";
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
