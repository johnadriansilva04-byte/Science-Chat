import { afterEach, describe, expect, it } from "vitest";

import {
  ONBOARDING_FAQS,
  ONBOARDING_FAQS_ALL,
  ONBOARDING_MAIN,
  faqSeed,
  takePendingQuestion,
  setPendingQuestion,
} from "@/lib/onboarding";

describe("onboarding", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("a dúvida principal é a do ORCID e vem primeiro", () => {
    expect(ONBOARDING_MAIN.question).toMatch(/orcid/i);
    expect(ONBOARDING_FAQS_ALL[0]).toBe(ONBOARDING_MAIN);
    expect(ONBOARDING_FAQS_ALL.length).toBe(ONBOARDING_FAQS.length + 1);
  });

  it("a pergunta principal explica que o ORCID é pessoal, gratuito e não obrigatório", () => {
    expect(ONBOARDING_MAIN.answer).toMatch(/gratuito/i);
    expect(ONBOARDING_MAIN.answer).toMatch(/pessoal/i);
    expect(ONBOARDING_MAIN.answer).toMatch(/não obrigatório/i);
  });

  it("faqSeed transforma a pergunta numa mensagem completa", () => {
    const seed = faqSeed("Preciso de vínculo?");
    expect(seed).toContain("Preciso de vínculo?");
    expect(seed).toMatch(/explique/i);
  });

  it("guarda e recupera a pergunta pendente uma única vez", () => {
    expect(takePendingQuestion()).toBeNull();
    setPendingQuestion("O que é o ORCID?");
    expect(takePendingQuestion()).toBe("O que é o ORCID?");
    expect(takePendingQuestion()).toBeNull();
  });
});
