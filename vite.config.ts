import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Configuração do ScienceChat (Cloudflare Workers).
//
// Regras do build que continuam valendo:
//  - Nunca definir ssr.external / resolve.external: o Worker não tem resolução
//    de módulos em runtime e o build quebra.
//  - Não adicionar compressão (gzip/brotli): a borda da Cloudflare já comprime.
export default defineConfig({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Redireciona o entry SSR para src/server.ts (wrapper de erro).
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    viteReact(),
    // Em desenvolvimento o nitro não roda; no build gera o Worker Cloudflare.
    nitro({ preset: "cloudflare-module" }),
  ],
});
