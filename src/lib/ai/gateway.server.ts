import { createWorkersAI } from "workers-ai-provider";
import { streamText, stepCountIs, type ModelMessage, type TextStreamPart, type ToolSet } from "ai";
import { getEnv, requireAi, type AiBinding } from "@/lib/cf/bindings.server";
import { drainLeakedCalls } from "@/lib/ai/leak-filter";
import { antiRepeatTransform } from "@/lib/ai/anti-repeat";

/**
 * Inferência via Cloudflare Workers AI (binding `AI`), no lugar de um gateway externo.
 * Modelo padrão configurável por env `AI_MODEL`.
 */
export const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/**
 * Modelo leve da entrevista.
 *
 * A cota gratuita da Workers AI é de 10.000 neurônios/dia e o 70B custa
 * 26.668/M de entrada e 204.805/M de saída — ~25 mensagens/dia. O 8B custa
 * 4.119/M e 34.868/M (6× menos): ~158 mensagens/dia. A entrevista é diálogo
 * curto e guiado, onde o 8B dá conta; a ESCRITA do documento (plano e páginas)
 * continua no 70B, porque ali a qualidade do texto é o produto.
 */
export const INTERVIEW_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";

/** Modelo da entrevista, permitindo override por env `AI_INTERVIEW_MODEL`. */
export function interviewModelId(): string {
  return process.env["AI_INTERVIEW_MODEL"] || INTERVIEW_MODEL;
}

/**
 * Teto de passos por mensagem. Cada passo é uma chamada de IA — e o histórico
 * inteiro é reenviado em cada uma. Três passos cobrem o ciclo real (chamada de
 * ferramenta → resultado → resposta); cinco só multiplicavam o custo nos casos
 * em que o modelo insistia em ferramentas, sem melhorar a resposta.
 */
export const MAX_STEPS = 3;

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

/**
 * O SSE da Workers AI repete o mesmo conteúdo em dois formatos no mesmo evento:
 *  - nativo:  `{ response: "…", tool_calls: [...] }`
 *  - OpenAI:  `{ choices: [{ delta: { content: "…", tool_calls: [...] } }] }`
 *
 * O `workers-ai-provider` lê os dois. Para texto isso duplica cada token
 * ("OlOlá!"); para tool calls duplica cada argumento, produzindo JSON inválido
 * ("{"titulo": "{"titulo": "…") e a ferramenta falha antes de executar. Quando o
 * formato OpenAI (`choices[].delta`) está presente, removemos os campos nativos
 * equivalentes. Modelos que só usam o formato nativo ficam intactos.
 */
function fixEvent(event: string): string {
  const line = event.split("\n").find((l) => l.startsWith("data: "));
  if (!line) return event;
  try {
    const parsed = JSON.parse(line.slice(6));
    const delta = parsed?.choices?.[0]?.delta;
    if (!delta) return event;
    let changed = false;
    if (delta.content !== undefined && parsed.response !== undefined) {
      delete parsed.response;
      changed = true;
    }
    if (delta.tool_calls !== undefined && parsed.tool_calls !== undefined) {
      delete parsed.tool_calls;
      changed = true;
    }
    return changed ? `data: ${JSON.stringify(parsed)}` : event;
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

/**
 * O proxy local do Workers AI (miniflare) serializa os argumentos de `run` com
 * devalue, que recusa objetos não-POJO. O provider envia um `AbortSignal` em
 * `options`, o que quebra o chat em desenvolvimento. O binding de IA não
 * documenta `signal`, então descartá-lo é seguro (a chamada segue normalmente).
 */
export function serializableRunOptions(options: unknown): unknown {
  if (!options || typeof options !== "object") return options;
  const { signal: _signal, ...rest } = options as Record<string, unknown>;
  return rest;
}

/** Binding `AI` com a correção de stream aplicada. */
function aiBinding(): AiBinding {
  const ai = requireAi();
  return {
    run(model: string, inputs: Record<string, unknown>, options?: unknown) {
      const result = ai.run(model, inputs, serializableRunOptions(options));
      if (!inputs["stream"]) return result;
      return Promise.resolve(result).then((r) =>
        r instanceof ReadableStream ? dedupeSseStream(r) : r,
      );
    },
  } as AiBinding;
}

function model(modelId: string = process.env["AI_MODEL"] || DEFAULT_MODEL) {
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

/**
 * Transform de stream que remove chamadas de ferramenta vazadas como texto,
 * acumulando deltas por id de texto (o texto pode chegar em vários pedaços) e
 * emitindo só o que é seguro. Chamadas confirmadas são descartadas em silêncio.
 */
function stripLeakedCallsTransform() {
  const buffers = new Map<string, string>();
  return new TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>>({
    transform(part, controller) {
      if (part.type !== "text-delta") {
        controller.enqueue(part);
        return;
      }
      const buffered = (buffers.get(part.id) ?? "") + part.text;
      const { safe, rest } = drainLeakedCalls(buffered);
      buffers.set(part.id, rest);
      if (safe) controller.enqueue({ ...part, text: safe });
    },
    flush(controller) {
      // Fim do stream: solta o que ficou retido (nunca engole texto legítimo).
      for (const [id, rest] of buffers) {
        const leftover = rest.trim();
        if (leftover) controller.enqueue({ type: "text-delta", id, text: rest });
      }
      buffers.clear();
    },
  });
}

/**
 * Modelo de visão (multimodal) da Workers AI: lê imagens (fotos, gráficos,
 * digitalizações) e devolve descrição + texto transcrito. Configurável por env.
 */
export const DEFAULT_VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

export function visionModelId(): string {
  return process.env["AI_VISION_MODEL"] || DEFAULT_VISION_MODEL;
}

/**
 * Descreve uma imagem (OCR + leitura de gráficos) usando o modelo de visão.
 * Recebe a imagem em base64 e o MIME, e devolve o texto descrito/transcrito.
 * Lança erro quando o binding de IA não está disponível (o chamador trata).
 */
export async function describeImage(
  base64: string,
  mime: string,
  instructions: string = "Descreva a imagem e transcreva o texto visível em português.",
  maxOutputTokens = 1024,
): Promise<string> {
  const { generateText } = await import("ai");
  const result = await generateText({
    model: visionModel(),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instructions },
          { type: "file", data: base64, mediaType: mime },
        ],
      },
    ],
    maxOutputTokens,
  });
  return result.text;
}

/** Modelo de visão, com o mesmo fallback de credenciais REST do modelo de texto. */
function visionModel() {
  const modelId = visionModelId();
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

export function startResponses(
  request: Request | undefined,
  messages: ModelMessage[],
  instructions: string,
  maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS,
  tools?: ToolSet,
  forcedTool?: string | null,
  antiRepeatSeed?: Iterable<string>,
  modelId?: string,
) {
  const result = streamText({
    model: model(modelId),
    system: instructions,
    messages,
    maxOutputTokens,
    // Dois filtros de saída, nesta ordem:
    //  1) segura/deduz o JSON de chamadas de ferramenta vazado como texto, para
    //     ele nunca aparecer cru no chat (ver `leak-filter.ts`);
    //  2) remove clichês de fecho ("Qual é o próximo passo?") e frases repetidas,
    //     que fazem o diálogo girar em círculo (ver `anti-repeat.ts`).
    experimental_transform: [stripLeakedCallsTransform, antiRepeatTransform(antiRepeatSeed)],
    ...(tools
      ? {
          tools,
          stopWhen: stepCountIs(MAX_STEPS),
          // Força a ferramenta pedida APENAS no primeiro passo. Sem isso, com
          // histórico longo o modelo narra a chamada como texto e a ferramenta
          // nunca executa; o provider só recupera chamadas "vazadas" quando a
          // escolha é forçada. Nos passos seguintes voltamos a "auto" para o
          // modelo escrever a confirmação.
          ...(forcedTool
            ? {
                prepareStep: ({ stepNumber }: { stepNumber: number }) =>
                  stepNumber === 0
                    ? { toolChoice: { type: "tool" as const, toolName: forcedTool } as never }
                    : {},
              }
            : {}),
        }
      : {}),
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
