/**
 * O SSE da Workers AI envia o mesmo texto em `response` e em
 * `choices[].delta.content`. O workers-ai-provider lê os dois e duplica cada
 * token. Este teste garante que o filtro remove a duplicata antes do provider.
 */
import { describe, expect, it } from "vitest";
import { dedupeSseStream } from "@/lib/ai/gateway.server";

const enc = new TextEncoder();

async function collect(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

function sse(events: unknown[]) {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  return new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(enc.encode(body));
      c.close();
    },
  });
}

describe("dedupeSseStream", () => {
  it("remove o campo response duplicado quando choices traz o texto", async () => {
    const raw = sse([
      { response: "Ol", choices: [{ delta: { content: "Ol" } }] },
      { response: "á!", choices: [{ delta: { content: "á!" } }] },
      { response: "" },
    ]);
    const text = await collect(dedupeSseStream(raw));
    const events = text
      .split("\n\n")
      .filter((l) => l.startsWith("data: "))
      .map((l) => JSON.parse(l.slice(6)));
    expect(events[0].response).toBeUndefined();
    expect(events[0].choices[0].delta.content).toBe("Ol");
    expect(events[1].response).toBeUndefined();
  });

  it("preserva o formato nativo quando não há choices", async () => {
    const raw = sse([{ response: "texto nativo" }]);
    const text = await collect(dedupeSseStream(raw));
    expect(text).toContain('"response":"texto nativo"');
  });

  it("reagrupa eventos divididos entre chunks", async () => {
    const full = `data: ${JSON.stringify({ response: "x", choices: [{ delta: { content: "x" } }] })}\n\n`;
    const half = Math.floor(full.length / 2);
    const raw = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode(full.slice(0, half)));
        c.enqueue(enc.encode(full.slice(half)));
        c.close();
      },
    });
    const text = await collect(dedupeSseStream(raw));
    expect(text).not.toContain('"response"');
    expect(text).toContain('"content":"x"');
  });
});
