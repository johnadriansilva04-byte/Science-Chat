import { describe, expect, it } from "vitest";

import { cleanQuestion, interviewNotes } from "@/lib/interview-notes";

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
});
