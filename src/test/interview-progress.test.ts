import { describe, expect, it } from "vitest";
import {
  extractStage,
  interviewMap,
  interviewProgress,
  interviewStage,
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

  it("nunca conta mais respostas do que perguntas (evita '5/4')", () => {
    const progress = interviewProgress([
      assistant("Qual é o tema?\n_Etapa: Entrevista_"),
      user("Primeira parte da resposta"),
      user("Complemento colado depois"),
      user("Mais um complemento"),
    ]);
    expect(progress.asked).toBe(1);
    expect(progress.answered).toBe(1);
    expect(progress.answered).toBeLessThanOrEqual(progress.asked);
    expect(progress.ratio).toBe(1);
  });
});

describe("interviewStage", () => {
  it("deriva a etapa da última pergunta, mesmo sem marcador _Etapa:_", () => {
    const stage = interviewStage([
      { role: "assistant", parts: [{ type: "text", text: "Qual é a sua tese?" }] },
      { role: "user", parts: [{ type: "text", text: "A ausência de vínculo." }] },
      { role: "assistant", parts: [{ type: "text", text: "Quais materiais você vai analisar?" }] },
    ]);
    expect(stage).toBe("Metodologia");
  });

  it("devolve null sem pergunta do assistente", () => {
    expect(interviewStage([{ role: "user", parts: [{ type: "text", text: "Oi" }] }])).toBeNull();
  });
});

describe("interviewMap", () => {
  const M = (role: string, text: string) => ({ role, parts: [{ type: "text", text }] });

  it("marca como respondida só a seção com resposta de conteúdo", () => {
    const map = interviewMap([
      M("user", "A ausência de vínculo muda o método?"),
      M("assistant", "Qual é a pergunta central que o artigo quer responder?"),
      M("user", "Saber se dá para publicar sem vínculo."),
      M("assistant", "Quais autores sustentam essa ideia?"),
      M("user", "Pular"),
      M("assistant", "Como você vai demonstrar isso: quais materiais e procedimentos?"),
    ]);
    const bySection = new Map(map.map((item) => [item.section, item.state]));
    expect(bySection.get("Introdução")).toBe("answered");
    // "Pular" não preenche a Fundamentação, mas o guard não volta a perguntá-la:
    // a faixa mostra "pulada" em vez de "em aberto" (que mentiria sobre o que falta).
    expect(bySection.get("Fundamentação teórica")).toBe("skipped");
    expect(bySection.get("Metodologia")).toBe("current");
  });

  it("devolve as seis seções na ordem do documento", () => {
    expect(interviewMap([]).map((item) => item.section)).toEqual([
      "Introdução",
      "Fundamentação teórica",
      "Metodologia",
      "Resultados",
      "Discussão",
      "Conclusão",
    ]);
  });
});

describe("interviewProgress — pergunta não é resposta", () => {
  const M = (role: string, text: string) => ({ role, parts: [{ type: "text", text }] });

  it("não conta a pergunta do pesquisador como resposta", () => {
    const p = interviewProgress([
      M("user", "A ausência de vínculo muda o método?"),
      M("assistant", "Qual é a pergunta central que o artigo quer responder?"),
      M("user", "Posso submeter sem vínculo institucional?"),
    ]);
    expect(p.asked).toBe(1);
    expect(p.answered).toBe(0);
    expect(p.ratio).toBe(0);
  });
});
