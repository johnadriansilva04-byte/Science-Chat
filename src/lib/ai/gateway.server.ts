import { createWorkersAI } from "workers-ai-provider";
import { streamText, type ModelMessage } from "ai";
import { requireAi } from "@/lib/cf/bindings.server";

/**
 * Inferência via Cloudflare Workers AI (binding `AI`), no lugar de um gateway externo.
 * Modelo padrão configurável por env `AI_MODEL`.
 */
export const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

function model() {
  const workersai = createWorkersAI({ binding: requireAi() as never });
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
