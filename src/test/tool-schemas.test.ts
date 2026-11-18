import { asSchema } from "ai";
import { describe, expect, it } from "vitest";

import { buildTools } from "@/lib/ai/tools.server";

// O modelo às vezes envia números como string ("8" em vez de 8). Sem coerção o
// schema rejeita, o AI_InvalidToolInputError sobe no meio do stream e o cliente
// recebe "network error" — o envio parecia falhar por rede sem ser.
describe("schemas das ferramentas toleram número como string", () => {
  const tools = buildTools({ userId: "u", articleId: "a" });

  const parse = async (name: keyof typeof tools, input: unknown) => {
    const result = await asSchema(tools[name].inputSchema).validate?.(input);
    expect(result?.success).toBe(true);
    return (result as { value: unknown }).value;
  };

  it("pesquisar_bases aceita limite em string", async () => {
    expect(
      await parse("pesquisar_bases", { consulta: "energia solar", limite: "8" }),
    ).toMatchObject({ consulta: "energia solar", limite: 8 });
  });

  it("ler_anexo aceita numero em string", async () => {
    expect(await parse("ler_anexo", { numero: "3" })).toMatchObject({ numero: 3 });
  });

  it("editar_pagina e acrescentar_na_pagina aceitam pagina em string", async () => {
    expect(await parse("editar_pagina", { pagina: "2", conteudo: "texto" })).toMatchObject({
      pagina: 2,
    });
    expect(await parse("acrescentar_na_pagina", { pagina: "5", texto: "mais" })).toMatchObject({
      pagina: 5,
    });
  });

  it("anexar_documento_em_pagina aceita pagina e numero_anexo em string", async () => {
    expect(
      await parse("anexar_documento_em_pagina", { pagina: "1", numero_anexo: "4" }),
    ).toMatchObject({ pagina: 1, numero_anexo: 4 });
  });
});
