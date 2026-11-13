import { createWorkersAI } from "workers-ai-provider";
import { streamText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { getEnv, requireAi, type AiBinding } from "@/lib/cf/bindings.server";

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

/**
 * `fetch` que aplica o mesmo filtro de duplicação nas respostas SSE. Usado no
 * modo credenciais (Vercel), onde o provider fala direto com a API REST.
 */
async function dedupingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("event-stream") || !response.body) return response;
  return new Response(dedupeSseStream(response.body), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
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
  const modelId = process.env["AI_MODEL"] || DEFAULT_MODEL;
  // Fora do Cloudflare (ex.: Vercel) não existe binding `AI`; usamos o modo
  // credenciais do provider, que fala com a API REST da Cloudflare.
  if (!getEnv().AI) {
    const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"];
    const apiKey = process.env["CLOUDFLARE_API_TOKEN"];
    if (!accountId || !apiKey) {
      throw new Error(
        "Binding 'AI' ausente e credenciais CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN não configuradas.",
      );
    }
    const workersai = createWorkersAI({ accountId, apiKey, fetch: dedupingFetch });
    return workersai(modelId as never);
  }
  const workersai = createWorkersAI({ binding: aiBinding() as never });
  return workersai(modelId as never);
}

/**
 * Teto de tokens de saída. A Workers AI usa um padrão baixo quando `max_tokens`
 * não é enviado, o que cortava as páginas no meio de uma frase (~1000 caracteres).
 * 2048 tokens cobrem com folga uma página A4 cheia (~650 palavras) e o plano.
 */
export const DEFAULT_MAX_OUTPUT_TOKENS = 2048;

export function startResponses(
  request: Request | undefined,
  messages: ModelMessage[],
  instructions: string,
  maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS,
  tools?: ToolSet,
) {
  const result = streamText({
    model: model(),
    system: instructions,
    messages,
    maxOutputTokens,
    ...(tools ? { tools, stopWhen: stepCountIs(5) } : {}),
    ...(request?.signal ? { abortSignal: request.signal } : {}),
  });
  return { result };
}

/** Gera e aguarda o texto final (para o plano e as páginas). */
export async function generateFinalText(
  prompt: string,
  instructions: string,
  maxOutputTokens?: number,
) {
  const { result } = startResponses(
    undefined,
    [{ role: "user", content: prompt }],
    instructions,
    maxOutputTokens,
  );
  const text = await result.text;
  if (!text.trim()) throw new Error("A IA não retornou texto. Tente novamente.");
  return text.trim();
}
