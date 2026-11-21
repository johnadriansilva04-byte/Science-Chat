import { describe, expect, it } from "vitest";
import type { TextStreamPart, ToolSet } from "ai";
import { EMPTY_REPLY_TEXT, emptyReplyGuard } from "@/lib/ai/empty-reply-guard";

type Part = TextStreamPart<ToolSet>;

async function run(parts: Part[]): Promise<Part[]> {
  const input = new ReadableStream<Part>({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
  const out: Part[] = [];
  const reader = input.pipeThrough(emptyReplyGuard()).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out.push(value);
  }
  return out;
}

function textOf(parts: Part[]): string {
  return parts.map((p) => (p.type === "text-delta" ? p.text : "")).join("");
}

describe("emptyReplyGuard", () => {
  // Regressão (chat real, 18/11): na fase de escrita o modelo terminou o turno
  // sem texto (gastou os passos em ferramentas) e o pesquisador recebeu uma
  // bolha vazia — o relato "o chat não responde nada".
  it("turno totalmente vazio recebe uma mensagem, não uma bolha em branco", async () => {
    const out = await run([]);
    expect(textOf(out)).toBe(EMPTY_REPLY_TEXT);
    const types = out.map((p) => p.type);
    expect(types).toContain("text-start");
    expect(types).toContain("text-end");
  });

  it("turno só com espaços também é tratado como vazio", async () => {
    const out = await run([
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "   \n  " },
      { type: "text-end", id: "t1" },
    ]);
    expect(textOf(out)).toContain(EMPTY_REPLY_TEXT);
  });

  it("turno com texto real passa intacto e não ganha aviso", async () => {
    const out = await run([
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Atualizei a página 2." },
      { type: "text-end", id: "t1" },
    ]);
    expect(textOf(out)).toBe("Atualizei a página 2.");
    expect(textOf(out)).not.toContain(EMPTY_REPLY_TEXT);
  });

  it("não engole os outros tipos de parte (ferramenta, raciocínio)", async () => {
    const out = await run([
      { type: "tool-call", toolCallId: "c1", toolName: "editar_pagina", input: {} } as Part,
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Feito." },
      { type: "text-end", id: "t1" },
    ]);
    expect(out.some((p) => p.type === "tool-call")).toBe(true);
    expect(textOf(out)).toBe("Feito.");
  });
});
