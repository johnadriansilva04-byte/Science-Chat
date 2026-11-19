import { describe, expect, it, vi } from "vitest";

import { memoizeSearch, REPEATED_SEARCH_NOTICE } from "@/lib/ai/tools.server";

// O modelo chamava pesquisar_bases duas vezes com a MESMA consulta no mesmo
// turno. Cada chamada gasta um passo do orçamento (MAX_STEPS = 3), e sobrava um
// passo só para a resposta — que saía curta, sem a pergunta da entrevista.
describe("memoizeSearch", () => {
  it("busca uma vez e avisa na repetição idêntica", async () => {
    const search = vi.fn(async (consulta: string, limite: number) => `${consulta}/${limite}`);
    const run = memoizeSearch(search);

    expect(await run("privação de sono", 10)).toBe("privação de sono/10");
    expect(await run("privação de sono", 10)).toBe(REPEATED_SEARCH_NOTICE);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("trata maiúsculas e espaços como a mesma consulta", async () => {
    const search = vi.fn(async (consulta: string, limite: number) => `${consulta}/${limite}`);
    const run = memoizeSearch(search);

    await run("Memória de trabalho", 8);
    expect(await run("  memória de trabalho  ", 8)).toBe(REPEATED_SEARCH_NOTICE);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("deixa passar consultas diferentes e limites diferentes", async () => {
    const search = vi.fn(async (consulta: string, limite: number) => `${consulta}/${limite}`);
    const run = memoizeSearch(search);

    expect(await run("sono", 8)).toBe("sono/8");
    expect(await run("memória", 8)).toBe("memória/8");
    expect(await run("sono", 5)).toBe("sono/5");
    expect(search).toHaveBeenCalledTimes(3);
  });

  it("não guarda resultado vazio de falha: erro propaga e a consulta pode ser refeita", async () => {
    const search = vi
      .fn<(consulta: string, limite: number) => Promise<string>>()
      .mockRejectedValueOnce(new Error("rede fora"))
      .mockResolvedValueOnce("ok");
    const run = memoizeSearch(search);

    await expect(run("sono", 8)).rejects.toThrow("rede fora");
    expect(await run("sono", 8)).toBe("ok");
  });
});
