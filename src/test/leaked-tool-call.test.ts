/**
 * O modelo às vezes "vaza" a chamada de ferramenta como texto (bloco ```json
 * com "name"/"parameters") em vez de emitir um tool call estruturado. Esse
 * texto, quando entra no histórico, faz o modelo repetir o vazamento e a
 * ferramenta nunca executa. Estes testes cobrem a detecção e a remoção.
 */
import { describe, expect, it } from "vitest";
import {
  extractLeakedToolCall,
  stripLeakedToolCalls,
  stripToolNameMentions,
  toolNameScrubTransform,
} from "@/lib/ai/leaked-tool-call";

const TOOLS = ["atualizar_titulo", "editar_pagina", "acrescentar_na_pagina", "definir_orcid"];

describe("extractLeakedToolCall", () => {
  it("extrai a chamada de um bloco ```json", () => {
    const text =
      'Vou usar a ferramenta `atualizar_titulo`.\n\n```json\n{\n  "name": "atualizar_titulo",\n  "parameters": { "titulo": "La Máquina Mimada" }\n}\n```\n\nPronto!';
    expect(extractLeakedToolCall(text, TOOLS)).toEqual({
      toolName: "atualizar_titulo",
      input: { titulo: "La Máquina Mimada" },
    });
  });

  it("aceita 'arguments' além de 'parameters'", () => {
    const text = '{"name": "editar_pagina", "arguments": {"pagina": 2, "texto": "x"}}';
    expect(extractLeakedToolCall(text, TOOLS)).toEqual({
      toolName: "editar_pagina",
      input: { pagina: 2, texto: "x" },
    });
  });

  it("ignora JSON que não é chamada de ferramenta conhecida", () => {
    expect(extractLeakedToolCall('{"foo": "bar"}', TOOLS)).toBeNull();
    expect(extractLeakedToolCall('{"name": "desconhecida", "parameters": {}}', TOOLS)).toBeNull();
  });
});

describe("stripLeakedToolCalls", () => {
  it("remove o bloco ```json de chamada e preserva a prosa", () => {
    const text =
      'J. Adrian! Vou usar a ferramenta `atualizar_titulo`.\n\n```json\n{\n  "name": "atualizar_titulo",\n  "parameters": { "titulo": "La Máquina Mimada" }\n}\n```\n\nTítulo atualizado com sucesso!';
    const out = stripLeakedToolCalls(text, TOOLS);
    expect(out).not.toContain('"name"');
    expect(out).not.toContain("```");
    expect(out).toContain("Vou usar a ferramenta");
    expect(out).toContain("Título atualizado com sucesso!");
  });

  it("remove JSON solto (sem cerca) de chamada", () => {
    const text = 'Título atualizado.\n{"name": "atualizar_titulo", "parameters": {"titulo": "X"}}';
    expect(stripLeakedToolCalls(text, TOOLS)).toBe("Título atualizado.");
  });

  it("preserva blocos ```json que não são chamadas de ferramenta", () => {
    const text = 'Exemplo de dados:\n\n```json\n{"titulo": "X", "ano": 2024}\n```';
    expect(stripLeakedToolCalls(text, TOOLS)).toContain('"titulo": "X"');
  });

  it("não mexe em texto sem vazamento", () => {
    const text = "O título do documento foi atualizado com sucesso!";
    expect(stripLeakedToolCalls(text, TOOLS)).toBe(text);
  });
});

// O modelo citava o NOME INTERNO da ferramenta na prosa: "registro com a
// ferramenta definir_orcid". Jargão sem sentido para o pesquisador.
describe("stripToolNameMentions", () => {
  it("remove a cláusula que cita a ferramenta", () => {
    expect(
      stripToolNameMentions(
        "Quando você voltar, eu registro com a ferramenta definir_orcid.",
        TOOLS,
      ),
    ).toBe("Quando você voltar, eu registro.");
  });

  it("remove o nome solto, com ou sem crase", () => {
    expect(stripToolNameMentions("Vou chamar `editar_pagina` agora.", TOOLS)).toBe(
      "Vou chamar agora.",
    );
    expect(stripToolNameMentions("Usei editar_pagina para corrigir.", TOOLS)).toBe(
      "Usei para corrigir.",
    );
  });

  it("não toca em texto legítimo", () => {
    const text = "Já registrei seu ORCID na folha de rosto e busquei na base.";
    expect(stripToolNameMentions(text, TOOLS)).toBe(text);
  });

  it("sem nomes conhecidos, devolve o texto intacto", () => {
    const text = "Vou usar a ferramenta definir_orcid.";
    expect(stripToolNameMentions(text, [])).toBe(text);
  });
});

describe("toolNameScrubTransform", () => {
  const run = async (chunks: string[]) => {
    const transform = toolNameScrubTransform(TOOLS);
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const readAll = (async () => {
      let out = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.type === "text-delta") out += value.text;
      }
      return out;
    })();
    for (const text of chunks) await writer.write({ type: "text-delta", id: "t1", text });
    await writer.close();
    return readAll;
  };

  it("limpa o nome mesmo partido entre deltas", async () => {
    const out = await run(["Já registrei. Usei a ferramenta ", "definir_", "orcid e pronto."]);
    expect(out).not.toContain("definir_orcid");
    expect(out).toContain("Já registrei.");
    expect(out).toContain("pronto.");
  });

  it("preserva texto normal em pedaços", async () => {
    const out = await run(["A privação de ", "sono afeta a ", "memória de trabalho."]);
    expect(out).toBe("A privação de sono afeta a memória de trabalho.");
  });
});
