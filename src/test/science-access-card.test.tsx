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

  // A home ENSINA (o pesquisador precisa do fundamento ali, não a um clique),
  // mas em versão contida: o guia completo com 11 etapas e todas as fontes
  // continua em /ciencia.
  it("a home ensina no próprio card e o guia completo vive em /ciencia", async () => {
    const { readFileSync } = await import("node:fs");
    const home = readFileSync("src/routes/index.tsx", "utf8");
    expect(home).toMatch(/<ScienceAccessCard[\s/>]/);

    const ciencia = readFileSync("src/routes/ciencia.tsx", "utf8");
    expect(ciencia).toContain("ScienceAtlas");
  });

  // O guia se ensina uma vez, na home. Repetir o card em cada página foi o que
  // o transformou em ruído: ele ocupava mais de uma tela em todas elas.
  it("o card educativo não se repete nas páginas secundárias", async () => {
    const { readFileSync } = await import("node:fs");
    for (const file of ["src/routes/museu.tsx", "src/routes/publicacoes/index.tsx"]) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toContain("ScienceAccessCard");
    }
  });

  // Sem cabeçalho com navegação, o /auth ainda precisa de uma porta para o guia.
  it("o /auth mantém uma única porta para o guia", async () => {
    const { readFileSync } = await import("node:fs");
    const auth = readFileSync("src/routes/auth.tsx", "utf8");
    const uses = auth.match(/<ScienceAccessCard/g) ?? [];
    expect(uses).toHaveLength(1);
  });

  it("o guia fica na navegação principal", async () => {
    const { readFileSync } = await import("node:fs");
    const nav = readFileSync("src/components/app/AppHeader.tsx", "utf8");
    expect(nav).toContain('to: "/ciencia"');
  });

  // O card do Stop só aparecia quando a cota da IA acabava — quem nunca esgotava
  // a cota nunca descobria o jogo. A home passa a ser a vitrine fixa dele.
  it("a home anuncia o Stop científico", async () => {
    const { readFileSync } = await import("node:fs");
    const home = readFileSync("src/routes/index.tsx", "utf8");
    expect(home).toContain("<GameCard");
  });

  // O card já foi um boletim: duas listas, dois acordeões e doze etapas, mais
  // de uma tela da home. A home mostra o convite e a resposta curta; o manual
  // vive no guia. Este teste falha se o boletim voltar.
  it("o card é UM cartão: sem listas, acordeões ou passo a passo", async () => {
    const { readFileSync } = await import("node:fs");
    const card = readFileSync("src/components/app/ScienceAccessCard.tsx", "utf8");
    expect(card).not.toContain("SCIENCE_STEPS");
    expect(card).not.toContain("NOT_REQUIRED");
    expect(card).not.toContain("WHAT_COUNTS");
    expect(card).not.toContain("referencesByRegion");
    expect(card).not.toContain("<details");
    expect(card).not.toContain('role="tab"');
    // Uma única porta para o guia, e o texto dela diz o que há lá dentro.
    expect(card.match(/to="\/ciencia"/g) ?? []).toHaveLength(1);
  });

  // O card responde a dúvida em uma frase e avisa da única exceção real
  // (pesquisa com seres humanos), sem despejar o guia na home.
  it("o card dá a resposta curta e a exceção da ética", async () => {
    const { readFileSync } = await import("node:fs");
    const card = readFileSync("src/components/app/ScienceAccessCard.tsx", "utf8");
    expect(card).toMatch(/não exige/);
    expect(card).toMatch(/vínculo\s+institucional/);
    expect(card).toMatch(/seres humanos/);
    expect(card).toMatch(/comitê de ética/);
  });

  // As fontes por país saíram do card junto com o boletim: quem quiser o link
  // oficial abre o guia. O que continua travado é que elas existam e cubram
  // Brasil e Uruguai.
  it("as fontes oficiais por país existem para Brasil e Uruguai", () => {
    const brasil = referencesByRegion("brasil");
    const uruguai = referencesByRegion("uruguai");
    expect(brasil.length).toBeGreaterThan(0);
    expect(uruguai.length).toBeGreaterThan(0);
    for (const ref of [...brasil, ...uruguai]) {
      expect(ref.url).toMatch(/^https:\/\//);
    }
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
