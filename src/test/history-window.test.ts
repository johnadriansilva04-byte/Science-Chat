import { describe, expect, it } from "vitest";

import { HISTORY_MAX_CHARS, HISTORY_WINDOW, windowHistory } from "@/lib/ai/history-window";

type Msg = { role: string; parts: { type: string; text?: string }[] };

const user = (text: string): Msg => ({ role: "user", parts: [{ type: "text", text }] });
const assistant = (text: string): Msg => ({ role: "assistant", parts: [{ type: "text", text }] });

describe("windowHistory", () => {
  it("não mexe em conversa curta", () => {
    const messages = [user("oi"), assistant("olá"), user("tudo bem?")];
    expect(windowHistory(messages)).toEqual(messages);
  });

  it("lista vazia continua vazia", () => {
    expect(windowHistory([])).toEqual([]);
  });

  it("corta o miolo e mantém as recentes", () => {
    const messages: Msg[] = [];
    for (let i = 0; i < 100; i += 1) messages.push(user(`pergunta ${i}`));
    const out = windowHistory(messages, 10);
    expect(out.length).toBeLessThanOrEqual(11);
    expect(out.at(-1)).toEqual(user("pergunta 99"));
    expect(out[0]).toEqual(user("pergunta 0")); // âncora: primeira fala
  });

  it("preserva a primeira fala do pesquisador (o tema do artigo)", () => {
    const messages: Msg[] = [user("Minha tese é adaptação cognitiva.")];
    for (let i = 0; i < 60; i += 1) {
      messages.push(assistant(`resposta ${i}`), user(`resposta do pesquisador ${i}`));
    }
    const out = windowHistory(messages, 6);
    expect(out[0]).toEqual(user("Minha tese é adaptação cognitiva."));
    expect(out.at(-1)?.parts[0]?.text).toBe("resposta do pesquisador 59");
  });

  it("nunca descarta a mensagem mais recente", () => {
    const huge = "x".repeat(HISTORY_MAX_CHARS + 5_000);
    const messages: Msg[] = [user("início"), assistant("ok"), user(huge)];
    const out = windowHistory(messages);
    expect(out.at(-1)).toEqual(user(huge));
  });

  it("respeita o teto de caracteres", () => {
    const messages: Msg[] = [];
    for (let i = 0; i < 50; i += 1) messages.push(user("a".repeat(5_000)));
    const out = windowHistory(messages, 50, 12_000);
    const chars = out.reduce((s, m) => s + (m.parts[0]?.text?.length ?? 0), 0);
    expect(chars).toBeLessThanOrEqual(12_000 + 5_000); // âncora + última podem exceder
    expect(out.length).toBeLessThan(50);
  });

  it("mantém a janela padrão conservadora", () => {
    expect(HISTORY_WINDOW).toBeGreaterThan(0);
    expect(HISTORY_WINDOW).toBeLessThanOrEqual(40);
    expect(HISTORY_MAX_CHARS).toBeLessThanOrEqual(40_000);
  });
});
