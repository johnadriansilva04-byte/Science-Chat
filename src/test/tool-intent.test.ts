import { describe, expect, it } from "vitest";
import { pickForcedTool } from "@/lib/ai/tool-intent";

describe("pickForcedTool", () => {
  it("detecta mudança de título", () => {
    expect(pickForcedTool("mude o titulo do documento para X")).toBe("atualizar_titulo");
    expect(pickForcedTool("troque o título para outro")).toBe("atualizar_titulo");
  });
  it("detecta edição de página", () => {
    expect(pickForcedTool("edite a página 2")).toBe("editar_pagina");
    expect(pickForcedTool("reescreva o parágrafo 1")).toBe("editar_pagina");
  });
  it("detecta acrescentar", () => {
    expect(pickForcedTool("acrescente um parágrafo na página 3")).toBe("acrescentar_na_pagina");
    expect(pickForcedTool("adicione texto na página 1")).toBe("acrescentar_na_pagina");
  });
  it("detecta pesquisa", () => {
    expect(pickForcedTool("pesquise literatura sobre violência institucional")).toBe(
      "pesquisar_bases",
    );
    expect(pickForcedTool("busque artigos sobre burocracia")).toBe("pesquisar_bases");
  });
  it("detecta anexos", () => {
    expect(pickForcedTool("anexe o documento na página 2")).toBe("anexar_documento_em_pagina");
  });
  it("detecta leitura de anexos específicos e de todos", () => {
    expect(pickForcedTool("olhe os documentos anexados")).toBe("ler_todos_anexos");
    expect(pickForcedTool("cara leia tudo de uma vez e traga o diagnostico")).toBe(
      "ler_todos_anexos",
    );
    expect(pickForcedTool("leia os anexos")).toBe("ler_todos_anexos");
    expect(pickForcedTool("analise o Anexo 3")).toBe("ler_anexo");
  });
  it("pedido de usar um anexo começa pela leitura (autonomia de posição)", () => {
    expect(
      pickForcedTool(
        'Use o Anexo 1 ("dados.csv") no meu artigo. Leia o conteúdo e decida o melhor lugar para citá-lo.',
      ),
    ).toBe("ler_anexo");
  });
  it("não dispara em frases avaliativas ou perguntas", () => {
    expect(pickForcedTool("o título está bom assim?")).toBeNull();
    expect(pickForcedTool("como funciona a metodologia?")).toBeNull();
    expect(pickForcedTool("tenho uma ideia sobre burocracia")).toBeNull();
  });
});

describe("pickForcedTool — provocação/advogado do diabo", () => {
  it("roteia pedidos de objeção para pesquisar_bases", () => {
    expect(pickForcedTool("seja advogado do diabo e aponte objeções")).toBe("pesquisar_bases");
    expect(pickForcedTool("qual a explicação alternativa para isso?")).toBe("pesquisar_bases");
    expect(pickForcedTool("provocar minha tese")).toBe("pesquisar_bases");
    expect(pickForcedTool("existe evidência que contradiz a tese?")).toBe("pesquisar_bases");
  });
});

describe("pickForcedTool — ORCID", () => {
  it("força definir_orcid quando o número é informado", () => {
    expect(pickForcedTool("Meu ORCID é 0000-0002-1825-0097")).toBe("definir_orcid");
    expect(pickForcedTool("0000000218250097")).toBe("definir_orcid");
    expect(pickForcedTool("orcid: 0000 0002 1825 0097")).toBe("definir_orcid");
  });

  it("não confunde números comuns com ORCID", () => {
    expect(pickForcedTool("a amostra teve 123 participantes")).toBeNull();
    expect(pickForcedTool("o ano de 2024 foi decisivo")).toBeNull();
    // 16 dígitos, mas sem dígito verificador válido: não é ORCID.
    expect(pickForcedTool("pesquisei os anos 2021 2022 2023 2024 no estudo")).toBeNull();
    expect(pickForcedTool("meu telefone é 1199 8888 7777 6666")).toBeNull();
  });

  // Regressão: "arrume" não estava na lista de verbos de edição, então a
  // ferramenta nunca era forçada e o modelo só narrava — o título ficava igual.
  it("reconhece pedidos de título com verbos do dia a dia", () => {
    expect(pickForcedTool("arrume o titulo para O Autodidata e seus Métodos")).toBe(
      "atualizar_titulo",
    );
    expect(pickForcedTool("conserta o titulo do artigo")).toBe("atualizar_titulo");
    expect(pickForcedTool("defina o título como O Autodidata")).toBe("atualizar_titulo");
  });
});
