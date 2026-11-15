/**
 * Filtro de stream para chamadas de ferramenta que o modelo "vaza" como TEXTO.
 *
 * O llama-3.3 (Workers AI) às vezes escreve o JSON da chamada na prosa em vez de
 * emitir um tool call estruturado — e isso aparecia CRU no chat do pesquisador:
 *
 *   {"name": "atualizar_titulo", "parameters": {"titulo": "…"}}
 *
 * `stripLeakedToolCalls` limpa o histórico salvo, mas o texto ao vivo ia direto
 * para a tela. Este filtro intercepta os deltas de texto do stream e segura
 * qualquer trecho que comece a se parecer com uma chamada, descartando-a quando
 * se confirma e liberando-o quando não passa de texto normal (inclusive código).
 *
 * É um filtro puro (sem I/O): recebe deltas de texto e devolve o que pode ser
 * exibido com segurança, acumulando o resto até dar para decidir.
 */

/** Acha o início de um possível JSON de chamada: `{"name"` ou `{"type": "function"`. */
function callStartIndex(buffer: string): number {
  const name = buffer.search(/\{\s*"name"\s*:/);
  const typed = buffer.search(/\{\s*"type"\s*:\s*"function"/);
  if (name === -1) return typed;
  if (typed === -1) return name;
  return Math.min(name, typed);
}

/** Acha o início de um bloco ```json / ``` que pode conter a chamada. */
function fenceStartIndex(buffer: string): number {
  return buffer.search(/```(?:json)?\s*\{/i);
}

/**
 * Índice de um sufixo que pode ainda virar uma chamada vazada: a última `{` cujo
 * resto (até o fim do buffer) é um prefixo plausível de `{"name":`. Ex.: `{`,
 * `{"`, `{"na`, `{"name"`. Devolve -1 quando não há prefixo pendente.
 */
function partialCallSuffixStart(buffer: string): number {
  const brace = buffer.lastIndexOf("{");
  if (brace === -1) return -1;
  const after = buffer.slice(brace + 1);
  // Prefixo de `"name":` ou de `"type"` (com espaços/aspas opcionais), sem mais.
  if (/^\s*"?(?:n(?:a(?:m(?:e"?)?)?)?|t(?:y(?:p(?:e"?)?)?)?)?\s*:?\s*$/.test(after)) return brace;
  return -1;
}

/**
 * Conta chaves para saber se o JSON que começa em `from` já fechou. Ignora o que
 * está dentro de strings (com escape), para não confundir `{` no valor.
 * Devolve o índice após a chave de fechamento, ou -1 se ainda está aberto.
 */
function jsonEnd(buffer: string, from: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = from; i < buffer.length; i += 1) {
    const ch = buffer[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** O objeto parece uma chamada de ferramenta? Aceita as duas formas vistas. */
function looksLikeCall(json: string): boolean {
  if (!/"name"\s*:/.test(json)) return false;
  // Forma 1: { "name": ..., "parameters"|"arguments": ... }
  // Forma 2: { "type": "function", "name": ..., "parameters": ... }
  const hasArgs = /"(parameters|arguments)"\s*:/.test(json);
  const isTyped = /"type"\s*:\s*"function"/.test(json);
  if (!hasArgs && !isTyped) return false;
  try {
    const parsed = JSON.parse(json) as { name?: unknown };
    return typeof parsed?.name === "string";
  } catch {
    return false;
  }
}

/**
 * Extrai do buffer tudo o que já pode ser exibido e remove as chamadas vazadas
 * confirmadas. Devolve o texto seguro e o que ficou retido (pode ser o começo de
 * uma chamada). Um `{` sem `"name"` logo depois é liberado como texto comum.
 */
export function drainLeakedCalls(buffer: string): { safe: string; rest: string } {
  let safe = "";
  let rest = buffer;
  for (;;) {
    const fence = fenceStartIndex(rest);
    const brace = callStartIndex(rest);
    // Preferimos o menor índice; um bloco ``` vem antes da chave.
    let start = -1;
    let isFence = false;
    if (fence !== -1 && (brace === -1 || fence <= brace)) {
      start = fence;
      isFence = true;
    } else if (brace !== -1) {
      start = brace;
    }
    if (start === -1) {
      // Nada suspeito ainda. Seguramos um sufixo que pode ser o começo de um
      // `{"name":` (a próxima delta completa a chave); liberamos o resto.
      const hold = partialCallSuffixStart(rest);
      if (hold > 0) {
        safe += rest.slice(0, hold);
        rest = rest.slice(hold);
      } else if (hold === 0) {
        // buffer inteiro é um começo parcial: retém tudo
      } else {
        safe += rest;
        rest = "";
      }
      break;
    }
    // Texto antes do candidato é seguro.
    safe += rest.slice(0, start);
    const fromBrace = isFence ? rest.indexOf("{", start) : start;
    const end = jsonEnd(rest, fromBrace);
    if (end === -1) {
      // Ainda não fechou: retemos do `start` em diante.
      rest = rest.slice(start);
      break;
    }
    let json = rest.slice(fromBrace, end);
    if (isFence) {
      const closeFence = rest.indexOf("```", end);
      if (closeFence === -1) {
        rest = rest.slice(start);
        break;
      }
      json = rest.slice(fromBrace, end);
      if (looksLikeCall(json)) {
        rest = rest.slice(closeFence + 3);
      } else {
        // Não era chamada: libera o bloco inteiro (ex.: exemplo de código).
        safe += rest.slice(start, closeFence + 3);
        rest = rest.slice(closeFence + 3);
      }
      continue;
    }
    if (looksLikeCall(json)) {
      rest = rest.slice(end);
    } else {
      // `{"name": ...}` sem parameters/arguments: não é chamada; libera.
      safe += rest.slice(start, end);
      rest = rest.slice(end);
    }
  }
  return { safe, rest };
}
