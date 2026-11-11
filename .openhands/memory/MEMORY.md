# ScienceChat — memória do projeto

Plataforma de produção científica independente (pt-BR). Stack: **TypeScript + React 19 + TanStack Start (SSR) + Vite**, rodando em **Cloudflare Workers**. Persistência em **D1** (SQLite), arquivos em **R2**, estado efêmero em **KV**, IA via **Workers AI**. Interface pt-BR.

**NÃO usa Lovable nem Supabase.** Essa migração foi feita do zero (2026-11-11) e é uma decisão firme do usuário ("ninguem usa lovable... nao e supabase caralho nos vamos usar a cloudflare"). Nunca reintroduzir Supabase/Postgres/drizzle/Lovable.

## Arquitetura Cloudflare
- Build: `npm run build` → nitro preset `cloudflare-module` → `.output/`. `wrangler.toml` na raiz é MESCLADO pelo nitro no `.output/server/wrangler.json` (os bindings D1/R2/KV/AI aparecem lá).
- Bindings: `DB` (D1), `FILES` (R2), `KV`, `AI` (Workers AI), `ASSETS`. Acessados em `src/lib/cf/bindings.server.ts` via `globalThis.__env__` (nitro injeta por request) com fallback `process.env`.
- IA: `src/lib/ai/gateway.server.ts` usa `createWorkersAI({ binding: env.AI })` de `workers-ai-provider@4` (peer `ai@7`). Modelo padrão `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (override por `AI_MODEL`).
- Auth própria: `src/lib/cf/auth.server.ts` (PBKDF2 via Web Crypto + token de sessão no D1 + cookie `sc_session` HttpOnly/SameSite=Lax/Secure). Server fns em `src/lib/auth.functions.ts`.
- Middleware `requireUser` (`src/lib/cf/auth-middleware.ts`) usa `getRequest()` de `@tanstack/react-start/server`. Cookies via `setResponseHeader("set-cookie", ...)`.
- Repositório D1: `src/lib/cf/repo.server.ts`. Sem RLS: TODA consulta filtra por `user_id` (posse verificada no código).
- `vite.config.ts` é próprio (não usa mais `@lovable.dev/vite-tanstack-config`): tailwindcss + tsConfigPaths + tanstackStart + viteReact + nitro.

## Convenções
- Rotas em `src/routes/` (file-based TanStack). `routeTree.gen.ts` é gerado — nunca editar à mão.
- Server functions em `src/lib/*.functions.ts` com `createServerFn({ method: "POST" }).validator(...)`. NÃO usar `inputValidator` (depreciado nesta versão).
- Schema D1 em `migrations/0001_init.sql`. Aplicar local: `npm run db:migrate:local`; remoto: `npm run db:migrate:remote`.
- Usar `npm` (não há bun). `package-lock.json` não é versionado (removido).

## Fluxo do produto (regra central)
Primeiro investigar (entrevista adaptativa) → depois documentar → depois auditar → depois plano aprovado → depois gerar **PÁGINA POR PÁGINA** com aprovação humana → montar documento mestre sem reescrever o aprovado. Nunca gerar o artigo inteiro de uma vez. Não exigir instituição/diploma/orientador.

## Armadilhas conhecidas
- `tsconfig`: `noImplicitReturns`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`. Não usar `return toast.error(...)`; acessar index signatures com `env["X"]`; não passar `undefined` explícito em props opcionais (spread condicional).
- 4 erros de tsc PRÉ-EXISTENTES (não nossos) em `src/components/ai-elements/{message,shimmer}.tsx`. `npm run build` passa mesmo assim.
- Dev server (`npm run dev`, porta **3000**) tenta emular bindings via wrangler. Sem `CLOUDFLARE_API_TOKEN` no ambiente ele cai no stub e a IA/D1 não funcionam; o SSR das páginas continua 200. Para bindings reais em dev: exportar `CLOUDFLARE_API_TOKEN` + `npm run preview:cf`.
- `wrangler deploy --dry-run` valida a config sem token.

## Estado (2026-11-11)
Migração Cloudflare completa no código: build verde, 17 testes (inclui integração real com SQLite via `node:sqlite` em `src/test/cf-data.test.ts`), `src/` 100% limpo de Supabase/Lovable. Falta apenas o DEPLOY real: o token Cloudflare do usuário NÃO está no ambiente (`CLOUDFLARE_API_TOKEN` ausente). Roteiro de deploy pronto em `scripts/cf-setup.sh` / `npm run cf:setup`.
Pendências de produto (pós-migração): dossiê documental (R2), matriz de rastreabilidade, auditoria científica, config editorial Udelar, exportação DOCX/LaTeX.
