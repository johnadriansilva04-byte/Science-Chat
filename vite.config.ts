import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Configuração do ScienceChat.
//
// Alvo padrão: Cloudflare Workers (bindings D1 + Workers AI). Quando
// `BUILD_TARGET=vercel` (ou rodando na Vercel, que define `VERCEL=1`), o nitro
// gera o bundle serverless da Vercel; nesse caso o acesso a D1/IA passa pelas
// APIs REST da Cloudflare (ver src/lib/cf/d1-rest.server.ts e ai/gateway.server.ts).
//
// Regras do build que continuam valendo:
//  - Nunca definir ssr.external / resolve.external: o Worker não tem resolução
//    de módulos em runtime e o build quebra.
//  - Não adicionar compressão (gzip/brotli): a borda já comprime.
const isVercel = process.env["BUILD_TARGET"] === "vercel" || process.env["VERCEL"] === "1";

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
    nitro({ preset: isVercel ? "vercel" : "cloudflare-module" }),
  ],
});
