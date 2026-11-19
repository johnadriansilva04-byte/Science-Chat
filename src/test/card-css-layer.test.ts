import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CSS fora de `@layer` vence qualquer utilitário do Tailwind, não importa a
 * ordem. Era o que acontecia com `.cracha-compact { display: flex }`: ele
 * anulava o `lg:hidden` e a `/auth` mostrava dois cards iguais no desktop.
 *
 * O teste lê a folha de estilo como texto porque o defeito só existe na
 * cascata — nenhum teste de componente pegaria.
 */
const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

/** Trecho da folha que está dentro de `@layer components { … }`. */
function componentsLayer(source: string): string {
  const start = source.indexOf("@layer components {");
  expect(start).toBeGreaterThan(-1);

  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i);
    }
  }
  throw new Error("@layer components não fecha");
}

describe("cascata do CSS", () => {
  const layer = componentsLayer(css);

  it("mantém os cards dentro de @layer components", () => {
    // Se voltarem para fora da camada, os utilitários (`lg:hidden`, `hidden`)
    // param de funcionar e os cards se multiplicam nas telas.
    for (const selector of [".cracha-compact {", ".cracha-card {", ".game-card {"]) {
      expect(css).toContain(selector);
      expect(layer).toContain(selector);
    }
  });

  it("não deixa regra de card fora de camada, nem antes nem depois do layer", () => {
    // Regra fora de `@layer` vence o Tailwind em qualquer posição do arquivo:
    // por isso o layer inteiro é removido antes de procurar sobras.
    const outside = css.replace(layer, "");
    expect(outside).not.toMatch(/^\.(cracha|game)-/m);
  });
});
