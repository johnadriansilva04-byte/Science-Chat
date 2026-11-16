import { describe, expect, it } from "vitest";
import { drainLeakedCalls } from "@/lib/ai/leak-filter";

/** Simula o stream: alimenta os deltas um a um e junta o que é liberado. */
function feed(chunks: string[]): string {
  let buffer = "";
  let out = "";
  for (const chunk of chunks) {
    buffer += chunk;
    const { safe, rest } = drainLeakedCalls(buffer);
    buffer = rest;
    out += safe;
  }
  return out + buffer;
}

describe("drainLeakedCalls", () => {
  it("remove uma chamada vazada inteira, mantendo a prosa em volta", () => {
    const text =
      'Vou atualizar o título.\n{"name": "atualizar_titulo", "parameters": {"titulo": "X"}}\nPronto.';
    const { safe, rest } = drainLeakedCalls(text);
    expect(safe).toBe("Vou atualizar o título.\n\nPronto.");
    expect(rest).toBe("");
  });

  it("remove a chamada mesmo quebrada em vários deltas", () => {
    const out = feed([
      "Ok. ",
      '{"name": "ler_a',
      'nexo", "param',
      'eters": {"numero": 3}}',
      " feito",
    ]);
    expect(out).not.toContain('"name"');
    expect(out).not.toContain("parameters");
    expect(out).toContain("Ok.");
    expect(out).toContain("feito");
  });

  it("remove bloco ```json com a chamada", () => {
    const text = 'Segue:\n```json\n{"name": "listar_anexos", "parameters": {}}\n```\nfim';
    const { safe } = drainLeakedCalls(text);
    expect(safe).toBe("Segue:\n\nfim");
  });

  it("NÃO remove JSON comum que não é chamada (sem name/parameters)", () => {
    const text = 'O resultado foi {"total": 3, "itens": []} e pronto.';
    const { safe, rest } = drainLeakedCalls(text);
    expect(safe + rest).toBe(text);
  });

  it("NÃO remove objeto com name mas sem parameters/arguments", () => {
    const text = 'O autor tem {"name": "Fulano", "ano": 2020} no artigo.';
    const { safe, rest } = drainLeakedCalls(text);
    expect(safe + rest).toBe(text);
  });

  it("segura a chave parcial e libera quando não vira chamada", () => {
    // `{` sozinho chega num delta e o resto vem depois como objeto comum.
    const out = feed(["valor ", "{", '"name": "x", "ano": 1}', " fim"]);
    expect(out).toBe('valor {"name": "x", "ano": 1} fim');
  });

  it("segura a chave partida byte a byte até virar chamada", () => {
    const out = feed([
      "Ok ",
      "{",
      '"',
      "na",
      "me",
      '"',
      ":",
      ' "x"',
      ",",
      ' "parameters": {}',
      "}",
      "!",
    ]);
    expect(out).not.toContain("name");
    expect(out).toBe("Ok !");
  });

  it("libera no flush quando o stream termina no meio de um candidato", () => {
    // Bloco ```json que nunca fecha: no fim soltamos o texto retido.
    const { safe, rest } = drainLeakedCalls('texto ```json\n{"name": "x"');
    expect(safe + rest).toContain("texto");
  });

  it('remove a forma {"type":"function", ...}', () => {
    const text = 'Vou ler.\n{"type": "function", "name": "listar_anexos", "parameters": {}}\nFim.';
    const { safe, rest } = drainLeakedCalls(text);
    expect(safe).toBe("Vou ler.\n\nFim.");
    expect(rest).toBe("");
  });

  it("texto sem nada suspeito passa intacto", () => {
    const text = "Entendi. Qual é o argumento central da sua teoria?";
    const { safe, rest } = drainLeakedCalls(text);
    expect(safe).toBe(text);
    expect(rest).toBe("");
  });
});
