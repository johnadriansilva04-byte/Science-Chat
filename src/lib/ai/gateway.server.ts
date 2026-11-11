import { createWorkersAI } from "workers-ai-provider";
import { streamText, type ModelMessage } from "ai";
import { requireAi, type AiBinding } from "@/lib/cf/bindings.server";

/**
 * Inferência via Cloudflare Workers AI (binding `AI`), no lugar de um gateway externo.
 * Modelo padrão configurável por env `AI_MODEL`.
 */
export const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/**
 * O SSE da Workers AI traz o mesmo texto em `response` (formato nativo) e em
 * `choices[].delta.content` (formato OpenAI). O `workers-ai-provider` lê os dois
 * e emite cada token em dobro ("OlOlá!"). Removemos `response` quando `choices`
 * já carrega o texto; modelos que só usam o formato nativo continuam intactos.
 */
export function dedupeSseStream(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) controller.enqueue(encoder.encode(fixEvent(event) + "\n\n"));
      },
      flush(controller) {
        if (buffer) controller.enqueue(encoder.encode(fixEvent(buffer)));
      },
    }),
  );
}

function fixEvent(event: string): string {
  const line = event.split("\n").find((l) => l.startsWith("data: "));
  if (!line) return event;
  try {
    const parsed = JSON.parse(line.slice(6));
    const hasChoicesText = parsed?.choices?.[0]?.delta?.content !== undefined;
    if (!hasChoicesText) return event;
    delete parsed.response;
    return `data: ${JSON.stringify(parsed)}`;
  } catch {
    return event;
  }
}

/** Binding `AI` com a correção de stream aplicada. */
function aiBinding(): AiBinding {
  const ai = requireAi();
  return {
    run(model: string, inputs: Record<string, unknown>, options?: unknown) {
      const result = ai.run(model, inputs, options);
      if (!inputs["stream"]) return result;
      return Promise.resolve(result).then((r) =>
        r instanceof ReadableStream ? dedupeSseStream(r) : r,
      );
    },
  } as AiBinding;
}

function model() {
  const workersai = createWorkersAI({ binding: aiBinding() as never });
  const modelId = process.env["AI_MODEL"] || DEFAULT_MODEL;
  return workersai(modelId as never);
}

export function startResponses(
  request: Request | undefined,
  messages: ModelMessage[],
  instructions: string,
) {
  const result = streamText({
    model: model(),
    system: instructions,
    messages,
    ...(request?.signal ? { abortSignal: request.signal } : {}),
  });
  return { result };
}

/** Gera e aguarda o texto final (para o plano e as páginas). */
export async function generateFinalText(prompt: string, instructions: string) {
  const { result } = startResponses(undefined, [{ role: "user", content: prompt }], instructions);
  const text = await result.text;
  if (!text.trim()) throw new Error("A IA não retornou texto. Tente novamente.");
  return text.trim();
}
