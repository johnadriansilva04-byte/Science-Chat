import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A folha (`.paper-sheet`) é clara nos dois temas, mas herdava a cor de texto
 * do tema escuro: branco sobre branco, ~1:1 de contraste. No modo livro dava
 * para ver a página e não ler uma palavra.
 *
 * A correção reescreve os tokens `--color-*` dentro da folha, porque o markdown
 * emite utilitários (`text-foreground`) que leem esses tokens e vencem a camada
 * `components`. O teste lê o CSS como texto: o defeito só existe na cascata.
 */
const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

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

/** Bloco `.paper-sheet { … }` (o primeiro, o da base). */
function paperSheetBlock(layer: string): string {
  const start = layer.indexOf(".paper-sheet {");
  expect(start).toBeGreaterThan(-1);
  const end = layer.indexOf("}", start);
  return layer.slice(start, end);
}

describe("contraste da folha", () => {
  const layer = componentsLayer(css);
  const block = paperSheetBlock(layer);

  it("pinta a tinta junto com o papel", () => {
    expect(block).toContain("background: var(--paper)");
    expect(block).toContain("color: var(--paper-ink)");
  });

  it("reescreve os tokens que o markdown lê", () => {
    // Sem isso, `text-foreground` dentro da folha continua branco.
    for (const token of ["--color-foreground", "--color-muted-foreground"]) {
      expect(block).toContain(`${token}: var(--paper-`);
    }
  });

  it("mantém a tinta escura e o papel claro nos dois temas", () => {
    for (const theme of [":root {", ".dark {"]) {
      const start = css.indexOf(theme);
      expect(start).toBeGreaterThan(-1);
      const scope = css.slice(start, css.indexOf("\n}", start));
      expect(scope).toContain("--paper-ink: oklch(0.21");
      expect(scope).toMatch(/--paper: oklch\(0\.9[5-9]/);
    }
  });

  it("não deixa `.book-nav` fora da camada", () => {
    // Fora do layer, o `display: inline-flex` dela vence o `max-sm:hidden` e
    // as setas do leitor vazam para fora da tela no celular.
    expect(layer).toContain(".book-nav {");
    expect(css.replace(layer, "")).not.toMatch(/^\.book-nav \{/m);
  });

  it("mantém a folha A4 sem o aperto mobile do papel", () => {
    // `.a4-sheet` também usa `.paper-sheet`, mas tem margens próprias (mm).
    // Precisa vir depois da media query, senão o padding de celular vence.
    const mobile = layer.indexOf("@media (max-width: 640px)");
    const a4 = layer.indexOf(".a4-sheet {");
    expect(mobile).toBeGreaterThan(-1);
    expect(a4).toBeGreaterThan(mobile);
    expect(layer.slice(a4, layer.indexOf("}", a4))).toContain("padding: 0");
  });
});
