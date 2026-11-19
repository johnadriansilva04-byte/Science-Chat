import { describe, expect, it } from "vitest";

import { cleanQuestion, interviewNotes, isDocumentCommand } from "@/lib/interview-notes";

describe("interviewNotes", () => {
  it("pairs each assistant question with the following user answer", () => {
    const notes = interviewNotes([
      {
        role: "assistant",
        parts: [{ type: "text", text: "Qual é o seu nome?\n\n_Etapa: Autor_" }],
      },
      { role: "user", parts: [{ type: "text", text: "Maria Souza" }] },
      { role: "assistant", parts: [{ type: "text", text: "Sobre o que quer pesquisar?" }] },
      { role: "user", parts: [{ type: "text", text: "IA na educação" }] },
    ]);
    expect(notes).toEqual([
      { question: "Qual é o seu nome?", answer: "Maria Souza" },
      { question: "Sobre o que quer pesquisar?", answer: "IA na educação" },
    ]);
  });

  it("ignores assistant messages that are not questions", () => {
    const notes = interviewNotes([
      { role: "assistant", parts: [{ type: "text", text: "Certo, entendi." }] },
      { role: "user", parts: [{ type: "text", text: "ok" }] },
    ]);
    expect(notes).toEqual([{ question: "Informação fornecida", answer: "ok" }]);
  });
});

describe("cleanQuestion", () => {
  it("drops the progress line and keeps the trailing question", () => {
    const q = cleanQuestion("Ótimo! Vamos começar. Qual é a sua área?\n\n_Etapa: Tema_");
    expect(q).toBe("Qual é a sua área?");
  });

  it("preserva o '?' ao truncar uma pergunta longa", () => {
    const long =
      "Sua tese é que a burocracia institucional bloqueia o acesso de pesquisadores " +
      "independentes a periódicos, mas você considerou o papel das redes informais que, " +
      "em muitos casos, funcionam como ponte para quem está fora da academia e publica " +
      "de forma autônoma, sem qualquer vínculo formal?";
    const q = cleanQuestion(long);
    expect(q.endsWith("?")).toBe(true);
    expect(q.length).toBeLessThanOrEqual(300);
  });

  it("pareia pergunta longa com a resposta (não cai em 'Informação fornecida')", () => {
    const long =
      "Você considerou as redes de colaboração informais que, em muitos casos, funcionam " +
      "como ponte para quem está fora da academia e publica de forma autônoma, sem vínculo " +
      "institucional algum, em revistas de acesso aberto e com revisão por pares?";
    const notes = interviewNotes([
      { role: "assistant", parts: [{ type: "text", text: long }] },
      { role: "user", parts: [{ type: "text", text: "Sim, considerei." }] },
    ]);
    expect(notes[0]?.question).not.toBe("Informação fornecida");
    expect(notes[0]?.question.endsWith("?")).toBe(true);
  });

  // Regressão: "arrume o titulo para X" foi gravado três vezes como parágrafo da
  // introdução, porque toda mensagem do usuário virava nota da entrevista.
  it("comando sobre o documento não vira conteúdo do artigo", () => {
    expect(isDocumentCommand("arrume o titulo para O Autodidata e seus Métodos")).toBe(true);
    const notes = interviewNotes([
      { role: "assistant", parts: [{ type: "text", text: "Qual é a sua tese?" }] },
      { role: "user", parts: [{ type: "text", text: "Minha tese é a adaptação cognitiva." }] },
      { role: "user", parts: [{ type: "text", text: "arrume o titulo para O Autodidata" }] },
    ]);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.answer).toBe("Minha tese é a adaptação cognitiva.");
  });

  it("não engole resposta longa de pesquisa", () => {
    expect(
      isDocumentCommand(
        "Estudo de caso exploratório com revisão de literatura sobre funções executivas " +
          "e parentificação, ancorado no certificado do ENCCEJA de 2019 e em relato autobiográfico.",
      ),
    ).toBe(false);
  });
});
