import { describe, expect, it } from "vitest";
import { hasPagePendingMarkers, pagePendingMarkers } from "@/lib/article-pending";

describe("pagePendingMarkers", () => {
  it("encontra dados e referências pendentes", () => {
    const content =
      "A taxa foi de [PENDENTE: confirmar IBGE 2023] e o autor diz (SILVA, 2020) " +
      "[REFERÊNCIA A CONFIRMAR: página do documento].";
    expect(pagePendingMarkers(content)).toEqual([
      "[PENDENTE: confirmar IBGE 2023]",
      "[REFERÊNCIA A CONFIRMAR: página do documento]",
    ]);
  });

  it("não repete o mesmo marcador", () => {
    const content = "[PENDENTE: dado] e de novo [PENDENTE: dado].";
    expect(pagePendingMarkers(content)).toHaveLength(1);
  });

  it("texto limpo não tem pendência", () => {
    expect(pagePendingMarkers("Tudo confirmado.")).toEqual([]);
    expect(pagePendingMarkers(null)).toEqual([]);
    expect(hasPagePendingMarkers("Tudo confirmado.")).toBe(false);
  });
});
