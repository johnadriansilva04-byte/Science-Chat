import { describe, expect, it } from "vitest";
import { parsePageCommand, parseRewriteRequest } from "@/lib/ai/page-command";

describe("parsePageCommand", () => {
  it("reconhece edição com 'palavra exata' e nome da ferramenta", () => {
    expect(
      parsePageCommand("Reescreva a página 1 com a palavra exata: coração. Use editar_pagina."),
    ).toEqual({ action: "edit", pagina: 1, conteudo: "coração" });
  });

  it("reconhece acréscimo com 'exatamente:'", () => {
    expect(
      parsePageCommand(
        "Use acrescentar_na_pagina na página 2 para adicionar exatamente: Observação 1: ação, coração.",
      ),
    ).toEqual({ action: "append", pagina: 2, conteudo: "Observação 1: ação, coração." });
  });

  it("reconhece 'conteúdo:' com sinal de igual e em inglês", () => {
    expect(
      parsePageCommand("Use editar_pagina pagina=3 conteudo=Texto final da página três."),
    ).toEqual({
      action: "edit",
      pagina: 3,
      conteudo: "Texto final da página três.",
    });
    expect(
      parsePageCommand(
        "Use the tool editar_pagina on page 4. Set conteudo to the exact word: coracao.",
      ),
    ).toEqual({ action: "edit", pagina: 4, conteudo: "coracao" });
  });

  it("edição vence acréscimo quando o verbo de edição está presente", () => {
    const cmd = parsePageCommand("Reescreva e acrescente na página 2 o texto: Algo novo.");
    expect(cmd?.action).toBe("edit");
  });

  it("ignora placeholders de conteúdo literal", () => {
    expect(
      parsePageCommand("Use editar_pagina pagina=1 conteudo=<the Portuguese word for heart>."),
    ).toBeNull();
  });

  it("não dispara sem número de página", () => {
    expect(parsePageCommand("Reescreva a introdução com a palavra exata: coração.")).toBeNull();
  });

  it("não dispara sem conteúdo literal delimitado", () => {
    expect(
      parsePageCommand(
        "Reescreva a página 1 do zero, em um único parágrafo de cerca de 120 palavras.",
      ),
    ).toBeNull();
  });

  it("não dispara em perguntas avaliativas", () => {
    expect(parsePageCommand("Qual é o próximo passo para o artigo?")).toBeNull();
    expect(parsePageCommand("A página 1 está boa assim?")).toBeNull();
  });

  it("remove a instrução de rodapé do conteúdo", () => {
    expect(
      parsePageCommand(
        "Acrescente na página 5 a frase exata: Fim. Use a ferramenta acrescentar_na_pagina.",
      ),
    ).toEqual({ action: "append", pagina: 5, conteudo: "Fim." });
  });
});

describe("parseRewriteRequest", () => {
  it("reconhece pedido de reescrita sem conteúdo literal", () => {
    expect(
      parseRewriteRequest("reescreva a página 1 acrescentando um resumo e palavras-chave"),
    ).toEqual({
      pagina: 1,
      instruction: "reescreva a página 1 acrescentando um resumo e palavras-chave",
    });
  });

  it("reconhece 'melhore a página 3' e 'revise a página 2'", () => {
    expect(parseRewriteRequest("melhore a página 3")?.pagina).toBe(3);
    expect(parseRewriteRequest("revise a página 2")?.pagina).toBe(2);
  });

  it("não dispara sem verbo de reescrita ou sem página", () => {
    expect(parseRewriteRequest("a página 1 está boa?")).toBeNull();
    expect(parseRewriteRequest("reescreva o artigo inteiro")).toBeNull();
  });

  it("não captura quando o pedido traz conteúdo literal (deixa para parsePageCommand)", () => {
    // O fluxo chama parsePageCommand primeiro; aqui só garantimos que a página é lida.
    expect(parseRewriteRequest("reescreva a página 1")?.pagina).toBe(1);
  });
});
