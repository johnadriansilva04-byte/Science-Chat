/**
 * Os transforms do chat seguram texto em buffer e o soltam no `flush()` do
 * stream. O problema: o `text-end` da parte passa adiante na hora, então o
 * texto liberado no flush chega DEPOIS do fechamento — e o AI SDK responde
 * `text part <id> not found`, que o chat mostra como "Não foi possível enviar".
 *
 * Estes testes fixam a ordem que o SDK exige: nenhum delta depois do text-end
 * da mesma parte.
 */
import { describe, expect, it } from "vitest";
import type { TextStreamPart, ToolSet } from "ai";
import { antiRepeatTransform } from "@/lib/ai/anti-repeat";
import { toolNameScrubTransform } from "@/lib/ai/leaked-tool-call";
import { interviewQuestionTransform } from "@/lib/ai/interview-guard";
import { holdTextEndTransform } from "@/lib/ai/stream-order";

type Part = TextStreamPart<ToolSet>;

async function run(parts: Part[], transforms: (() => TransformStream<Part, Part>)[]) {
  let stream: ReadableStream<Part> = new ReadableStream<Part>({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
  for (const transform of transforms) stream = stream.pipeThrough(transform());
  const out: Part[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out.push(value);
  }
  return out;
}

/** Ids de parte de texto que receberam delta depois do próprio text-end. */
function deltasAfterEnd(parts: Part[]): string[] {
  const ended = new Set<string>();
  const bad: string[] = [];
  for (const part of parts) {
    if (part.type === "text-end") ended.add(part.id);
    if (part.type === "text-delta" && ended.has(part.id)) bad.push(part.id);
  }
  return bad;
}

const chain = () => [
  antiRepeatTransform([]),
  () => toolNameScrubTransform(["definir_orcid"]),
  () => interviewQuestionTransform([]),
  () => holdTextEndTransform(),
];

describe("ordem das partes de texto no stream do chat", () => {
  it("não emite delta depois do text-end quando o filtro solta texto no flush", async () => {
    const parts: Part[] = [
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "O sono consolida a memória" },
      { type: "text-delta", id: "t1", text: " e o método precisa deixar isso claro." },
      { type: "text-end", id: "t1" },
    ];
    const out = await run(parts, chain());
    expect(deltasAfterEnd(out)).toEqual([]);
  });

  it("não emite delta depois do text-end quando o clichê de fecho é liberado", async () => {
    const parts: Part[] = [
      { type: "text-start", id: "t2" },
      { type: "text-delta", id: "t2", text: "A amostra tem 30 estudantes." },
      { type: "text-delta", id: "t2", text: " Qual é o próximo passo?" },
      { type: "text-end", id: "t2" },
    ];
    const out = await run(parts, chain());
    expect(deltasAfterEnd(out)).toEqual([]);
  });

  it("fecha toda parte de texto que foi aberta", async () => {
    const parts: Part[] = [
      { type: "text-start", id: "a" },
      { type: "text-delta", id: "a", text: "Primeira parte sem ponto final" },
      { type: "text-end", id: "a" },
      { type: "text-start", id: "b" },
      { type: "text-delta", id: "b", text: "Segunda parte também sem ponto" },
      { type: "text-end", id: "b" },
    ];
    const out = await run(parts, chain());
    const started = out.filter((p) => p.type === "text-start").map((p) => p.id);
    const ended = out.filter((p) => p.type === "text-end").map((p) => p.id);
    expect(ended.sort()).toEqual(started.sort());
  });

  it("preserva o texto inteiro, sem perder o que ficou retido", async () => {
    const parts: Part[] = [
      { type: "text-start", id: "t3" },
      { type: "text-delta", id: "t3", text: "A hipótese é testável" },
      { type: "text-end", id: "t3" },
    ];
    const out = await run(parts, chain());
    const text = out
      .filter((p) => p.type === "text-delta")
      .map((p) => p.text)
      .join("");
    expect(text).toContain("hipótese é testável");
  });
});
