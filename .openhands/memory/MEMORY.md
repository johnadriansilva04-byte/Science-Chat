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

## Deploy no Vercel (mesmo código, backends REST)
Alvo duplo: Cloudflare (padrão) e Vercel. No Vercel não há bindings, então o app fala com a Cloudflare por REST.
- `src/lib/cf/d1-rest.server.ts`: adaptador D1 sobre a API REST da Cloudflare (mesma interface de `prepare/bind/first/all/run/batch`). `bindings.server.ts` o usa quando falta o binding `DB` e há `CLOUDFLARE_ACCOUNT_ID`+`D1_DATABASE_ID`+`CLOUDFLARE_API_TOKEN`.
- `gateway.server.ts`: sem binding `AI`, usa o modo credenciais do `workers-ai-provider` (REST) com o mesmo filtro de dedup de SSE.
- `vite.config.ts`: preset nitro `vercel` quando `BUILD_TARGET=vercel`/`VERCEL=1`; senão `cloudflare-module`.
- Projeto Vercel: `sciencechat` (team `team_uCst7CAEh18U0FR1kPrEcDHJ`), domínio `sciencechat.vercel.app`. Push na `main` dispara deploy de produção.
- ARMADILHA: o Vercel usa Node 22 (npm 10), que CRASHA no `npm install` deste projeto (`Cannot read properties of null (reading 'edgesOut')`, bug do arborist com `vitest`). Fixado Node 24 (`nodeVersion: "24.x"`, `engines.node >=24`, `packageManager: npm@11.21.0`). NÃO reverter para Node 22.
- ARMADILHA: projeto novo vem com SSO de deployment ligado (302 para o login da Vercel). Desativar com `PATCH /v9/projects/{p}` `{"ssoProtection":null}`. Framework deve ser `null` (não `tanstack-start-lovable`).
- Segredo: o `$GITHUB_TOKEN` do ambiente NÃO tem acesso ao repo; usar o PAT do usuário para push.

## Fluxo do produto (regra central)
Primeiro investigar (entrevista adaptativa) → depois documentar → depois auditar → depois plano aprovado → depois gerar **PÁGINA POR PÁGINA** com aprovação humana → montar documento mestre sem reescrever o aprovado. Nunca gerar o artigo inteiro de uma vez. Não exigir instituição/diploma/orientador.

## Armadilhas conhecidas
- `tsconfig`: `noImplicitReturns`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`. Não usar `return toast.error(...)`; acessar index signatures com `env["X"]`; não passar `undefined` explícito em props opcionais (spread condicional).
- 4 erros de tsc PRÉ-EXISTENTES (não nossos) em `src/components/ai-elements/{message,shimmer}.tsx`. `npm run build` passa mesmo assim.
- Dev server (`npm run dev`, porta **3000**) tenta emular bindings via wrangler. Sem `CLOUDFLARE_API_TOKEN` no ambiente ele cai no stub e a IA/D1 não funcionam; o SSR das páginas continua 200. Para bindings reais em dev: exportar `CLOUDFLARE_API_TOKEN` + `npm run preview:cf`.
- `wrangler deploy --dry-run` valida a config sem token.

## Estado (2026-11-11)
Migração Cloudflare completa no código: build verde, 20 testes (inclui integração real com SQLite via `node:sqlite` em `src/test/cf-data.test.ts`), `src/` 100% limpo de Supabase/Lovable. Publicado no Vercel (`sciencechat.vercel.app`) com backends REST da Cloudflare — fluxo validado em produção (cadastro, entrevista com IA, plano, página por página, documento mestre). O deploy Cloudflare nativo continua pronto mas depende do `CLOUDFLARE_API_TOKEN` do usuário no ambiente (`npm run cf:setup`).
Pendências de produto (pós-migração): dossiê documental (R2), matriz de rastreabilidade, auditoria científica, config editorial Udelar, exportação DOCX/LaTeX.
