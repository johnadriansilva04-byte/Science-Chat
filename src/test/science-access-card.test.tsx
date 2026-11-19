import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import {
  COUNTRY_PATHS,
  NOT_REQUIRED,
  SCIENCE_REFERENCES,
  SCIENCE_STEPS,
  WHAT_COUNTS,
  referencesByRegion,
} from "@/lib/science-access";
import { SCIENCE_BITES } from "@/lib/science-flow";

const router = () =>
  createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    context: { queryClient: new QueryClient() },
  });

describe("ScienceAccessCard", () => {
  it("a rota do atlas existe", () => {
    expect(router().matchRoutes("/ciencia").at(-1)?.routeId).toBe("/ciencia");
  });

  it("a home inclui o card educativo completo", async () => {
    const { readFileSync } = await import("node:fs");
    const home = readFileSync("src/routes/index.tsx", "utf8");
    expect(home).toContain("<ScienceAccessCard />");
    expect(home).not.toContain('variant="compact"');
  });

  // Páginas que já têm conteúdo próprio não repetem o passo a passo inteiro.
  it("as páginas secundárias usam a variante compacta", async () => {
    const { readFileSync } = await import("node:fs");
    for (const file of [
      "src/routes/auth.tsx",
      "src/routes/museu.tsx",
      "src/routes/publicacoes/index.tsx",
    ]) {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/<ScienceAccessCard variant="compact"/);
    }
  });

  // O card da home precisa ENSINAR, não só linkar: passos com fundamento,
  // o que não é exigido e as fontes por país.
  it("o card mostra os passos com o fundamento de cada um", async () => {
    const { readFileSync } = await import("node:fs");
    const card = readFileSync("src/components/app/ScienceAccessCard.tsx", "utf8");
    expect(card).toContain("SCIENCE_BITES");
    expect(card).toContain("bite.why");
    expect(card).toContain("bite.whatFor");
    expect(card).toContain("NOT_REQUIRED");
    expect(card).toContain("WHAT_COUNTS");
  });

  it("o card traz fontes oficiais por país, com Brasil e Uruguai", async () => {
    const { readFileSync } = await import("node:fs");
    const card = readFileSync("src/components/app/ScienceAccessCard.tsx", "utf8");
    expect(card).toContain("referencesByRegion");
    expect(card).toContain('target="_blank"');
    const brasil = referencesByRegion("brasil");
    const uruguai = referencesByRegion("uruguai");
    expect(brasil.length).toBeGreaterThan(0);
    expect(uruguai.length).toBeGreaterThan(0);
  });

  it("os dados do guia cobrem Brasil e Uruguai (Udelar)", () => {
    const ids = COUNTRY_PATHS.map((path) => path.id);
    expect(ids).toContain("brasil");
    expect(ids).toContain("uruguai");
    const uruguai = referencesByRegion("uruguai")
      .map((ref) => ref.label)
      .join(" ");
    expect(uruguai).toMatch(/Udelar/);
    expect(uruguai).toMatch(/SciELO Uruguay/);
  });

  it("o conteúdo obrigatório está preenchido e não vazio", () => {
    expect(SCIENCE_BITES.length).toBeGreaterThan(0);
    expect(SCIENCE_STEPS.length).toBeGreaterThan(0);
    expect(NOT_REQUIRED.length).toBeGreaterThan(0);
    expect(WHAT_COUNTS.length).toBeGreaterThan(0);
    for (const bite of SCIENCE_BITES) {
      expect(bite.title.trim()).not.toBe("");
      expect(bite.why.trim()).not.toBe("");
    }
    for (const ref of SCIENCE_REFERENCES) {
      expect(ref.url).toMatch(/^https:\/\//);
    }
  });
});
