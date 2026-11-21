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
    expect(takePendingQuestion()).toEqual({ text: "O que é o ORCID?", fromFaq: false });
    expect(takePendingQuestion()).toBeNull();
  });

  it("marca a pergunta do FAQ para receber a instrução de resposta pronta", () => {
    setPendingQuestion("Publicar custa dinheiro?", true);
    expect(takePendingQuestion()).toEqual({ text: "Publicar custa dinheiro?", fromFaq: true });
  });

  it("mantém a inquietação da home separada da instrução do FAQ", () => {
    // A inquietação digitada na home não pode ganhar o texto do FAQ: era ele que
    // virava título e semente do artigo, com uma frase a mais colada.
    setPendingQuestion("Por que o sono afeta a memória");
    const pending = takePendingQuestion();
    expect(pending?.fromFaq).toBe(false);
    expect(faqSeed(pending!.text)).not.toBe(pending!.text);
    expect(pending!.text).not.toMatch(/Me explique de forma clara/);
  });

  it("lê o formato antigo guardado como string pura", () => {
    sessionStorage.setItem("sc:onboarding-question", "Pergunta antiga");
    expect(takePendingQuestion()).toEqual({ text: "Pergunta antiga", fromFaq: false });
  });
});
