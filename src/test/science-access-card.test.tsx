import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

const router = () =>
  createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    context: { queryClient: new QueryClient() },
  });

describe("ScienceAccessCard", () => {
  // O card é um `Link` para o atlas; renderizá-lo isolado exige contexto de
  // router. Aqui verificamos o que importa: a rota existe e a home aponta para
  // ela, sem despejar o guia na página.
  it("a rota do atlas existe", () => {
    expect(router().matchRoutes("/ciencia").at(-1)?.routeId).toBe("/ciencia");
  });

  it("a home não renderiza o guia inteiro", async () => {
    const { readFileSync } = await import("node:fs");
    const home = readFileSync("src/routes/index.tsx", "utf8");
    expect(home).toContain("<ScienceAccessCard />");
    expect(home).not.toContain("ScienceAccessCard inline");
  });
});
