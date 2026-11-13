import { describe, expect, it } from "vitest";
import { groupNotesBySection, sectionForQuestion } from "@/lib/interview-notes";

describe("sectionForQuestion", () => {
  it("classifica problema/tese na Introdução", () => {
    expect(sectionForQuestion("Qual é a sua tese?")).toBe("Introdução");
    expect(sectionForQuestion("Qual o problema de pesquisa?")).toBe("Introdução");
  });
  it("classifica metodologia", () => {
    expect(sectionForQuestion("Como você pretende coletar os dados?")).toBe("Metodologia");
    expect(sectionForQuestion("Qual a amostra?")).toBe("Metodologia");
  });
  it("classifica resultados e discussão", () => {
    expect(sectionForQuestion("Quais foram os resultados?")).toBe("Resultados");
    expect(sectionForQuestion("Como você interpreta isso?")).toBe("Discussão");
  });
  it("classifica fundamentação e referências", () => {
    expect(sectionForQuestion("Quais autores sustentam a teoria?")).toBe("Fundamentação teórica");
    expect(sectionForQuestion("Quais referências você tem?")).toBe("Referências");
  });
  it("cai em Outras informações quando não reconhece", () => {
    expect(sectionForQuestion("Você prefere trabalhar à noite?")).toBe("Outras informações");
  });
});

describe("groupNotesBySection", () => {
  it("agrupa e ordena por seção canônica", () => {
    const grouped = groupNotesBySection([
      { question: "Quais autores?", answer: "Foucault" },
      { question: "Qual a sua tese?", answer: "X" },
      { question: "Quais resultados?", answer: "Y" },
    ]);
    expect(grouped.map((g) => g.section)).toEqual([
      "Introdução",
      "Fundamentação teórica",
      "Resultados",
    ]);
  });
});
