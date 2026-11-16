import { describe, expect, it } from "vitest";
import { buildAcervo, classicsToAcervo, publicationsToAcervo } from "@/lib/acervo";
import { MUSEUM_WORKS } from "@/lib/museum";
import type { PublicationSummary } from "@/lib/publication.functions";

function pub(over: Partial<PublicationSummary>): PublicationSummary {
  return {
    id: over.id ?? "p1",
    slug: over.slug ?? "slug-1",
    title: over.title ?? "Título",
    author_name: over.author_name ?? "Autora",
    area: over.area ?? null,
    language: over.language ?? "pt",
    abstract: over.abstract ?? null,
    published_at: over.published_at ?? "2026-01-02T00:00:00Z",
    doi: over.doi ?? null,
    review_status: over.review_status ?? "nao_revisado",
  };
}

describe("classicsToAcervo", () => {
  it("converte todas as obras do museu e nunca as marca como contribuição", () => {
    const items = classicsToAcervo();
    expect(items).toHaveLength(MUSEUM_WORKS.length);
    expect(items.every((i) => i.kind === "classico")).toBe(true);
    expect(items.every((i) => i.slug === null)).toBe(true);
  });

  it("preserva o DOI e monta a URL do editor", () => {
    const einstein = classicsToAcervo().find((i) => i.title.includes("eletrodinâmica"))!;
    expect(einstein.doi).toBe("10.1002/andp.19053221004");
    expect(einstein.doiUrl).toBe("https://doi.org/10.1002/andp.19053221004");
    expect(einstein.originalTitle).toBe("Zur Elektrodynamik bewegter Körper");
  });
});

describe("publicationsToAcervo", () => {
  it("marca revisado apenas quando o autor comprovou", () => {
    const [ok, pending] = publicationsToAcervo([
      pub({ id: "a", review_status: "revisado" }),
      pub({ id: "b", review_status: "nao_revisado" }),
    ]);
    expect(ok!.reviewed).toBe(true);
    expect(pending!.reviewed).toBe(false);
    expect(pending!.kind).toBe("contribuicao");
  });

  it("trata status inesperado como não revisado (nunca superestima)", () => {
    const [x] = publicationsToAcervo([pub({ review_status: "desconhecido" as never })]);
    expect(x!.reviewed).toBe(false);
  });

  it("marca homenagem quando o slug consta em ACERVO_HOMAGES", () => {
    const [h] = publicationsToAcervo([
      pub({ slug: "calculo-mental-sem-papel-adaptacao-cognitiva-hawking" }),
    ]);
    expect(h!.homage?.honoree).toContain("Hawking");
    const [plain] = publicationsToAcervo([pub({ slug: "outro-artigo" })]);
    expect(plain!.homage).toBeNull();
  });
});

describe("buildAcervo", () => {
  it("separa clássicos, revisados e não revisados sem misturar", () => {
    const acervo = buildAcervo([
      pub({ id: "r", review_status: "revisado" }),
      pub({ id: "n", review_status: "nao_revisado" }),
    ]);
    expect(acervo.classics).toHaveLength(MUSEUM_WORKS.length);
    expect(acervo.reviewed.map((i) => i.id)).toEqual(["contrib:r"]);
    expect(acervo.notReviewed.map((i) => i.id)).toEqual(["contrib:n"]);
    // Clássicos NÃO entram na seção "Revisados por pares".
    expect(acervo.reviewed.some((i) => i.kind === "classico")).toBe(false);
  });

  it("retira as homenagens das demais listas e as expõe à parte", () => {
    const acervo = buildAcervo([
      pub({ id: "h", slug: "calculo-mental-sem-papel-adaptacao-cognitiva-hawking" }),
      pub({ id: "n" }),
    ]);
    expect(acervo.homages.map((i) => i.id)).toEqual(["contrib:h"]);
    expect(acervo.counts.homages).toBe(1);
    expect(acervo.notReviewed.map((i) => i.id)).toEqual(["contrib:n"]);
    // A homenagem não aparece duplicada em "não revisados".
    expect(acervo.notReviewed.some((i) => i.homage)).toBe(false);
  });

  it("agrupa os clássicos por ala do museu", () => {
    const acervo = buildAcervo([]);
    expect(acervo.classicsByWing).toHaveLength(3);
    expect(acervo.classicsByWing.every((g) => g.items.length > 0)).toBe(true);
  });

  it("conta corretamente e lida com acervo vazio de contribuições", () => {
    const acervo = buildAcervo([]);
    expect(acervo.counts.reviewed).toBe(0);
    expect(acervo.counts.notReviewed).toBe(0);
    expect(acervo.counts.homages).toBe(0);
    expect(acervo.counts.classics).toBe(MUSEUM_WORKS.length);
    expect(acervo.counts.total).toBe(MUSEUM_WORKS.length);
  });
});
