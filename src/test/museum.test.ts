import { describe, expect, it } from "vitest";
import { MUSEUM_SIZE, MUSEUM_WORKS, museumDoiUrl } from "@/lib/museum";
import { inboxToMessage, type InboxWork } from "@/lib/pracinha-inbox";

describe("acervo do museu", () => {
  it("tem 30 obras e o tamanho declarado bate", () => {
    expect(MUSEUM_WORKS).toHaveLength(30);
    expect(MUSEUM_SIZE).toBe(30);
  });

  it("toda obra tem DOI, ano e uma ala válida", () => {
    for (const w of MUSEUM_WORKS) {
      expect(w.doi).toMatch(/^10\./);
      expect(w.year).toBeGreaterThan(1800);
      expect(["revolucao", "poder", "mente"]).toContain(w.wing);
    }
  });

  it("não repete DOI", () => {
    const dois = MUSEUM_WORKS.map((w) => w.doi);
    expect(new Set(dois).size).toBe(dois.length);
  });

  it("monta a URL do DOI", () => {
    expect(museumDoiUrl("10.1038/171737a0")).toBe("https://doi.org/10.1038/171737a0");
  });

  it("acha obras por tag (ex.: tecnologia)", () => {
    const achou = MUSEUM_WORKS.filter((w) => w.tags.includes("tecnologia"));
    expect(achou.length).toBeGreaterThanOrEqual(3);
  });
});

describe("caixa de entrada do Pracinha", () => {
  const work: InboxWork = {
    title: "On Computable Numbers",
    authors: "Turing, A. M.",
    year: 1937,
    venue: "Proc. London Math. Soc.",
    doi: "10.1112/plms/s2-42.1.230",
  };

  it("formata a mensagem com título, metadados e DOI", () => {
    const msg = inboxToMessage([work]);
    expect(msg).toContain("Trouxe estas obras do Museu");
    expect(msg).toContain("On Computable Numbers");
    expect(msg).toContain("DOI: 10.1112/plms/s2-42.1.230");
  });

  it("lista várias obras", () => {
    const msg = inboxToMessage([work, { ...work, doi: "10.1000/xyz" }]);
    expect(msg.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(2);
  });
});
