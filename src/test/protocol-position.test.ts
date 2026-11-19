import { describe, expect, it } from "vitest";

import { firstHeading, protocolKey, protocolPosition } from "@/lib/protocol-position";
import { SECTION_GUIDE } from "@/lib/section-guide";

describe("protocolPosition", () => {
  it("lê a seção do primeiro título da página", () => {
    expect(protocolPosition("# Introdução\n\nTexto…")).toBe(4);
    expect(protocolPosition("## Metodologia\n\nTexto…")).toBe(6);
  });

  it("ignora numeração no título", () => {
    expect(protocolPosition("# 1. Introdução")).toBe(4);
    expect(protocolPosition("# 2.2 Fundamentação teórica")).toBe(5);
  });

  it("aceita apelidos comuns das seções", () => {
    expect(protocolPosition("# Referencial teórico")).toBe(5);
    expect(protocolPosition("# Métodos")).toBe(6);
    expect(protocolPosition("# Considerações finais")).toBe(9);
  });

  it("não adivinha quando não há título reconhecível", () => {
    expect(protocolPosition("Texto solto sem título.")).toBe(0);
    expect(protocolPosition("")).toBe(0);
    expect(protocolPosition(null)).toBe(0);
  });

  it("devolve a chave estável da seção", () => {
    expect(protocolKey("# Resultados")).toBe("resultados");
    expect(protocolKey("nada")).toBeNull();
  });

  it("cobre todas as seções do guia", () => {
    SECTION_GUIDE.forEach((section, i) => {
      expect(protocolPosition(`# ${section.title}`)).toBe(i + 1);
    });
  });

  it("extrai o título sem os cerques do Markdown", () => {
    expect(firstHeading("## Resumo ##")).toBe("resumo");
  });
});
