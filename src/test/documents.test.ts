import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64 } from "@/lib/base64";
import { extractText } from "@/lib/documents.server";
import { formatHits, type ResearchHit } from "@/lib/research.server";
import { insertAnexoMarker, anexoMarker } from "@/lib/anexo";

describe("base64", () => {
  it("faz round-trip de bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 42]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });
});

describe("extractText", () => {
  it("lê texto puro", () => {
    const b64 = bytesToBase64(new TextEncoder().encode("Olá mundo científico"));
    expect(extractText("nota.txt", "text/plain", b64)).toBe("Olá mundo científico");
  });

  it("lê CSV pelo nome do arquivo", () => {
    const b64 = bytesToBase64(new TextEncoder().encode("a,b\n1,2"));
    expect(extractText("dados.csv", "", b64)).toBe("a,b\n1,2");
  });

  it("devolve null para binário sem texto legível", () => {
    const b64 = bytesToBase64(new Uint8Array([1, 2, 3, 4]));
    expect(extractText("foto.jpg", "image/jpeg", b64)).toBeNull();
  });
});

describe("formatHits", () => {
  const hit: ResearchHit = {
    title: "Burocracia e violência institucional",
    authors: "Silva, J.; Souza, M.",
    year: 2021,
    venue: "Revista de Direito",
    doi: "10.1234/abc",
    url: "https://doi.org/10.1234/abc",
    source: "openalex",
  };

  it("lista resultados com metadados e DOI", () => {
    const out = formatHits([hit]);
    expect(out).toContain("1. Burocracia e violência institucional");
    expect(out).toContain("Silva, J.; Souza, M.");
    expect(out).toContain("2021");
    expect(out).toContain("DOI: 10.1234/abc");
  });

  it("informa quando nada foi encontrado", () => {
    expect(formatHits([])).toMatch(/Nenhum resultado/);
  });
});

describe("anexo markers", () => {
  it("monta o marcador simples e com legenda", () => {
    expect(anexoMarker(3)).toBe("[Anexo 3]");
    expect(anexoMarker(3, "Figura 1 — prova")).toBe("Figura 1 — prova [Anexo 3]");
  });

  it("insere após o parágrafo pedido", () => {
    const content = "Par 1.\n\nPar 2.\n\nPar 3.";
    const out = insertAnexoMarker(content, 2, "após o parágrafo 2");
    expect(out.split(/\n{2,}/)).toEqual(["Par 1.", "Par 2.", "[Anexo 2]", "Par 3."]);
  });

  it("acrescenta ao final quando não há posição", () => {
    const out = insertAnexoMarker("Par 1.", 5);
    expect(out.endsWith("[Anexo 5]")).toBe(true);
  });

  it("acrescenta ao final quando só há um parágrafo", () => {
    const out = insertAnexoMarker("Único.", 1, "após o parágrafo 3");
    expect(out).toBe("Único.\n\n[Anexo 1]");
  });
});
