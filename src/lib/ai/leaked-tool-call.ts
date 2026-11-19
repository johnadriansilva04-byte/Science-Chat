/**
 * Alguns modelos (llama-3.3 no Workers AI) às vezes "vazam" a chamada de
 * ferramenta como TEXTO no chat em vez de emitirem um tool call estruturado:
 *
 *   Vou usar a ferramenta `atualizar_titulo`.
 *
 *   ```json
 *   { "name": "atualizar_titulo", "parameters": { "titulo": "…" } }
 *   ```
 *
 * O efeito prático: a ferramenta nunca executa e o JSON cru aparece para o
 * pesquisador. Pior: quando esse texto vaza para o histórico, ele "envenena"
 * as respostas seguintes, que passam a repetir o mesmo padrão.
 *
 * Este módulo detecta e remove/recupera esses vazamentos. É puro (sem I/O)
 * para ser testável e reutilizável tanto no histórico quanto no stream.
 */

import type { TextStreamPart, ToolSet } from "ai";

export type LeakedToolCall = { toolName: string; input: Record<string, unknown> };

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normaliza o objeto da chamada vazada para `{ name, parameters|arguments }`. */
function candidateToCall(candidate: unknown, knownNames: Set<string>): LeakedToolCall | null {
  if (!isObject(candidate)) return null;
  const name = candidate["name"];
  if (typeof name !== "string" || (knownNames.size > 0 && !knownNames.has(name))) return null;
  const rawArgs =
    "arguments" in candidate
      ? candidate["arguments"]
      : "parameters" in candidate
        ? candidate["parameters"]
        : undefined;
  let input: JsonObject = {};
  if (typeof rawArgs === "string") {
    try {
      const parsed = JSON.parse(rawArgs);
      input = isObject(parsed) ? parsed : {};
    } catch {
      return null;
    }
  } else if (isObject(rawArgs)) {
    input = rawArgs;
  }
  return { toolName: name, input };
}

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

/** Extrai a primeira chamada de ferramenta vazada de um texto, se houver. */
export function extractLeakedToolCall(
  text: string,
  toolNames: Iterable<string> = [],
): LeakedToolCall | null {
  const known = new Set(toolNames);
  // Blocos cercados por ``` (json) ou JSON solto com "name"/"parameters".
  const blocks: string[] = [];
  const fence = /```(?:json)?\s*([\s\S]*?)```/gi;
  for (const match of text.matchAll(fence)) if (match[1]) blocks.push(match[1]);
  if (!blocks.length) blocks.push(text);

  for (const block of blocks) {
    const parsed = parseJsonLoose(block);
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      const call = candidateToCall(candidate, known);
      if (call) return call;
    }
  }
  return null;
}

/**
 * Remove do texto as chamadas de ferramenta vazadas (blocos ```json e JSON
 * solto com "name"/"parameters"), preservando a prosa em volta. Usado para
 * higienizar o histórico antes de enviá-lo ao modelo.
 */
/** Remove espaços/pontuação órfãos deixados ao cortar um trecho. */
function tidyPunctuation(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])\1+/g, "$1")
    .replace(/,\s*\./g, ".")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Remove NOMES INTERNOS de ferramentas citados na prosa. O modelo escreve coisas
 * como "registro com a ferramenta definir_orcid" — jargão que não significa nada
 * para o pesquisador. Nomes têm sublinhado, então nunca colidem com palavra
 * normal; o risco de remover texto legítimo é nulo.
 */
export function stripToolNameMentions(text: string, toolNames: Iterable<string> = []): string {
  const names = [...toolNames];
  if (!names.length) return text;
  const alternation = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  let out = text;
  // "com a ferramenta X", "usando a função X", "via tool X" — a cláusula inteira.
  out = out.replace(
    new RegExp(
      `\\s*(?:,\\s*)?(?:com|usando|usar|usa|via|pela|pelo|atrav[ée]s d[ae]|na|no)?\\s*` +
        `(?:a|o|as|os)?\\s*(?:ferramenta|fun[çc][ãa]o|tool)s?\\s+\`?(?:${alternation})\`?`,
      "gi",
    ),
    "",
  );
  // Nome solto (com ou sem crase) que sobrou.
  out = out.replace(new RegExp(`\`?(?:${alternation})\`?`, "gi"), "");
  // Preserva os espaços das bordas: no stream os deltas se emendam e um
  // `trim` aqui colaria a última palavra de um pedaço na primeira do seguinte.
  const leading = out.match(/^\s*/)?.[0] ?? "";
  const trailing = out.match(/\s*$/)?.[0] ?? "";
  return leading + tidyPunctuation(out) + trailing;
}

export function stripLeakedToolCalls(text: string, toolNames: Iterable<string> = []): string {
  const known = new Set(toolNames);
  let out = text;

  out = out.replace(/```(?:json)?\s*([\s\S]*?)```/gi, (whole, inner: string) => {
    const parsed = parseJsonLoose(inner);
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    const isCall = candidates.some((c) => candidateToCall(c, known));
    return isCall ? "" : whole;
  });

  // JSON solto com chaves aninhadas (ex.: {"name":"x","parameters":{"a":1}}).
  let result = out;
  for (;;) {
    const nameAt = result.indexOf('"name"');
    if (nameAt === -1) break;
    const from = result.lastIndexOf("{", nameAt);
    if (from === -1) break;
    let depth = 0;
    let end = -1;
    for (let i = from; i < result.length; i++) {
      if (result[i] === "{") depth++;
      else if (result[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break;
    const candidate = parseJsonLoose(result.slice(from, end + 1));
    if (candidateToCall(candidate, known)) {
      result = result.slice(0, from) + result.slice(end + 1);
    } else {
      // Não é chamada: marca este "name" como consumido para não repetir.
      result = result.slice(0, nameAt) + "§§NAME§§" + result.slice(nameAt + 6);
    }
  }
  out = result.replace(/§§NAME§§/g, '"name"');

  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Transform de stream que remove nomes internos de ferramentas da prosa ao vivo.
 * Segura a última palavra do buffer: um nome pode chegar partido entre deltas
 * ("definir_" + "orcid"), e emitir o pedaço já mostraria o jargão na tela.
 */
/**
 * Índice a partir do qual o buffer ainda pode virar um nome de ferramenta.
 * Segurar só a última palavra não basta: a cláusula "com a ferramenta …" é
 * emitida antes de o nome chegar no delta seguinte, e aí o nome apareceria
 * sozinho na tela. Seguramos a cláusula aberta e a palavra parcial.
 */
function holdStart(buffer: string, names: string[]): number {
  let hold = buffer.length;
  const clause =
    /(?:^|\s)(?:(?:com|usando|usar|usa|via|pela|pelo|atrav[ée]s d[ae]|na|no)\s+)?(?:a\s+|o\s+|as\s+|os\s+)?(?:ferramenta|fun[çc][ãa]o|tool)s?\s*$/i.exec(
      buffer,
    );
  if (clause) hold = clause.index;
  const tail = /[A-Za-zÀ-ÿ_]+$/.exec(buffer)?.[0] ?? "";
  if (tail) {
    const lower = tail.toLowerCase();
    const partial = names.some(
      (n) => n.toLowerCase() !== lower && n.toLowerCase().startsWith(lower),
    );
    if (partial) hold = Math.min(hold, buffer.length - tail.length);
  }
  return hold;
}

export function toolNameScrubTransform(
  toolNames: Iterable<string>,
): TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>> {
  const names = [...toolNames];
  const buffers = new Map<string, string>();
  return new TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>>({
    transform(part, controller) {
      if (part.type !== "text-delta" || !names.length) {
        controller.enqueue(part);
        return;
      }
      const buffered = (buffers.get(part.id) ?? "") + part.text;
      const hold = holdStart(buffered, names);
      const ready = buffered.slice(0, hold);
      buffers.set(part.id, buffered.slice(hold));
      const safe = stripToolNameMentions(ready, names);
      if (safe) controller.enqueue({ ...part, text: safe });
    },
    flush(controller) {
      for (const [id, rest] of buffers) {
        buffers.delete(id);
        const safe = stripToolNameMentions(rest, names);
        if (safe.trim()) controller.enqueue({ type: "text-delta", id, text: safe });
      }
    },
  });
}
