/**
 * Plugin de diagramas (Mermaid) do Streamdown com carregamento sob demanda.
 *
 * O `@streamdown/mermaid` importa o Mermaid de forma estática, o que puxa ~5 MB
 * (mermaid + parser + cytoscape + dagre) para o bundle inicial — mesmo que o
 * pesquisador nunca escreva um diagrama. Aqui o Mermaid é importado só no
 * primeiro `render`, ficando num chunk separado.
 *
 * Implementa a interface `DiagramPlugin` do Streamdown.
 */

import type { DiagramPlugin } from "streamdown";

const DEFAULTS = {
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
  fontFamily: "monospace",
  suppressErrorRendering: true,
} as const;

let loaded: Promise<typeof import("mermaid")> | null = null;

function loadMermaid() {
  loaded ??= import("mermaid");
  return loaded;
}

export const lazyMermaid: DiagramPlugin = {
  name: "mermaid",
  type: "diagram",
  language: "mermaid",
  getMermaid(config) {
    const settings: Record<string, unknown> = { ...DEFAULTS, ...config };
    let initialized = false;
    return {
      initialize(next) {
        Object.assign(settings, next);
        initialized = false;
      },
      async render(id, source) {
        const { default: mermaid } = await loadMermaid();
        if (!initialized) {
          mermaid.initialize(settings);
          initialized = true;
        }
        return mermaid.render(id, source);
      },
    };
  },
};
