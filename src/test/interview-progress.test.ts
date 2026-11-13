import { describe, expect, it } from "vitest";
import {
  extractStage,
  interviewProgress,
  isSkipAnswer,
  messageText,
  type MessageLike,
} from "@/lib/interview-progress";

const user = (text: string): MessageLike => ({ role: "user", parts: [{ type: "text", text }] });
const assistant = (text: string): MessageLike => ({
  role: "assistant",
  parts: [{ type: "text", text }],
});

describe("messageText", () => {
  it("junta apenas as partes de texto", () => {
    const message: MessageLike = {
      role: "assistant",
      parts: [{ type: "tool" }, { type: "text", text: "olá" }, { type: "text", text: "mundo" }],
    };
    expect(messageText(message)).toBe("olá mundo");
  });
});

describe("extractStage", () => {
  it("lê a etapa entre marcadores", () => {
    expect(extractStage("Pergunta?\n_Etapa: Entrevista_")).toBe("Entrevista");
  });
  it("devolve null quando não há etapa", () => {
    expect(extractStage("só um texto")).toBeNull();
  });
});

describe("isSkipAnswer", () => {
  it("reconhece as respostas de pulo", () => {
    expect(isSkipAnswer("Pular")).toBe(true);
    expect(isSkipAnswer("não se aplica")).toBe(true);
    expect(isSkipAnswer("Quero responder depois")).toBe(true);
    expect(isSkipAnswer("Ainda não sei")).toBe(true);
  });
  it("não confunde uma resposta real", () => {
    expect(isSkipAnswer("Pesquisa sobre epistemologia")).toBe(false);
  });
});

describe("interviewProgress", () => {
  it("conta perguntas e respostas e calcula a razão", () => {
    const progress = interviewProgress([
      assistant("Olá! Quero começar meu artigo científico."),
      assistant("Qual é o seu nome?\n_Etapa: Entrevista_"),
      user("Maria Souza"),
      assistant("Qual é o tema do seu artigo?\n_Etapa: Entrevista_"),
      user("Pular"),
    ]);
    expect(progress.asked).toBe(2);
    expect(progress.answered).toBe(1);
    expect(progress.skipped).toBe(1);
    expect(progress.ratio).toBe(1);
    expect(progress.stage).toBe("Entrevista");
  });

  it("conta apenas a última pergunta da mensagem", () => {
    const progress = interviewProgress([
      assistant("Explico o método. Você concorda? Qual é a sua resposta?"),
      user("Sim"),
    ]);
    expect(progress.asked).toBe(1);
  });

  it("não divide por zero quando ainda não há perguntas", () => {
    const progress = interviewProgress([user("Olá")]);
    expect(progress.asked).toBe(0);
    expect(progress.ratio).toBe(0);
  });
});
