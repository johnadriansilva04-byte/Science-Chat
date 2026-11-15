import { describe, expect, it } from "vitest";
import { toolFailed, toolLabel, toolOutputText, toolSucceeded } from "@/lib/tool-trace";

describe("toolLabel", () => {
  it("devolve o rótulo em gerúndio para ferramentas conhecidas", () => {
    expect(toolLabel("pesquisar_bases")).toBe("pesquisando bases científicas");
    expect(toolLabel("editar_pagina")).toBe("reescrevendo uma página");
  });

  it("cai no rótulo genérico para nomes desconhecidos", () => {
    expect(toolLabel("ferramenta_inexistente")).toBe("alterando o documento");
  });
});

describe("toolOutputText", () => {
  it("devolve strings diretamente", () => {
    expect(toolOutputText("1. Autor (2020)")).toBe("1. Autor (2020)");
  });

  it("extrai de objetos { value } e { text }", () => {
    expect(toolOutputText({ value: "resultado" })).toBe("resultado");
    expect(toolOutputText({ text: "saída" })).toBe("saída");
  });

  it("devolve vazio para entradas sem texto", () => {
    expect(toolOutputText(null)).toBe("");
    expect(toolOutputText(42)).toBe("");
    expect(toolOutputText({})).toBe("");
  });
});

describe("toolSucceeded / toolFailed", () => {
  it("reconhece os estados do AI SDK", () => {
    expect(toolSucceeded("output-available")).toBe(true);
    expect(toolSucceeded("input-streaming")).toBe(false);
    expect(toolFailed("output-error")).toBe(true);
    expect(toolFailed(undefined)).toBe(false);
  });
});
