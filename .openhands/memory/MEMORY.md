# ScienceChat — memória do projeto

Plataforma de produção científica independente (pt-BR). Stack: **TypeScript + React 19 + TanStack Start (SSR) + Vite** em **Cloudflare Workers**; **D1** (SQLite), **R2** (arquivos), **KV**, IA via **Workers AI**.

**NÃO usa Lovable nem Supabase** — decisão firme do usuário. Nunca reintroduzir Supabase/Postgres/drizzle/Lovable.

Detalhes longos, histórico e armadilhas completas: `.openhands/memory/2026-11-11.md`.

## Arquitetura Cloudflare
- Build: `npm run build` → nitro preset `cloudflare-module` → `.output/` (o `wrangler.toml` da raiz é MESCLADO no `.output/server/wrangler.json`). `vite.config.ts` próprio (tailwind + tsConfigPaths + tanstackStart + viteReact + nitro).
- Bindings em `src/lib/cf/bindings.server.ts` via `globalThis.__env__` (nitro injeta por request), fallback `process.env`.
- IA: `src/lib/ai/gateway.server.ts` → `createWorkersAI({ binding: env.AI })` (`workers-ai-provider@4`, peer `ai@7`). Modelo `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (override `AI_MODEL`).
- Auth própria: `src/lib/cf/auth.server.ts` (PBKDF2 + sessão no D1 + cookie `sc_session` HttpOnly/SameSite=Lax/Secure); `auth.functions.ts`; middleware `requireUser` (`src/lib/cf/auth-middleware.ts`).
- Repositório D1: `src/lib/cf/repo.server.ts`. Sem RLS: TODA consulta filtra por `user_id` (posse no código).

## Convenções
- Rotas em `src/routes/` (file-based TanStack). `routeTree.gen.ts` é gerado — nunca editar.
- Server functions em `src/lib/*.functions.ts` com `createServerFn({ method: "POST" }).validator(...)`. NÃO usar `inputValidator` (depreciado).
- Schema D1 em `migrations/` (`0001_init`, `0002_documents`, `0003_publications`). `npm run db:migrate:local|remote`.
- Usar `npm` (sem bun). `package-lock.json` não é versionado.

## Deploy
**Cloudflare é o alvo.** `npm run build` + `npx wrangler deploy` → **https://sciencechat.sciencechat.workers.dev**. Bindings ativos: `DB`, `AI`, `ASSETS`. E2E validado em produção.
- `CLOUDFLARE_ACCOUNT_ID=e0bc773c8694ee0d7eda3c4549878d52`; D1 `sciencechat` = `b8793250-696e-4538-aa50-03796ff8635f`. R2 não habilitado na conta (erro 10042); KV só leitura. Sessões ficam no D1.
- **Push GitHub**: `$GITHUB_TOKEN`/`OH_GIT_CREDENTIAL_ACCESS_TOKEN_GITHUB` dão 403 (sem write). Só funciona com o PAT do usuário (`GH_PAT` no ambiente):
  `export GH_PAT && git -c credential.helper='' -c credential.helper='!f() { echo username=x-access-token; echo password="$GH_PAT"; }; f' push origin HEAD:main`
  Antes: `git fetch origin main` + confirmar fast-forward (`git merge-base --is-ancestor origin/main HEAD`). Repo é **shallow**; NUNCA rebase/force-push.
- Vercel é caminho alternativo (mesmo código, via REST): detalhes no log diário (Node 24 obrigatório, desligar SSO).

## Fluxo do produto (regra central)
Investigar (entrevista adaptativa) → documentar → auditar → plano aprovado → gerar **PÁGINA POR PÁGINA** com aprovação humana → montar documento mestre sem reescrever o aprovado. Nunca gerar o artigo inteiro de uma vez. Não exigir instituição/diploma/orientador.

## Armadilhas conhecidas
- `tsconfig`: `noImplicitReturns`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`. Não usar `return toast.error(...)`; index signatures com `env["X"]`; sem `undefined` explícito em props opcionais (spread condicional).
- **Truncagem (Workers AI):** sempre passar `maxOutputTokens` ao `streamText` (`DEFAULT_MAX_OUTPUT_TOKENS = 2048` em `gateway.server.ts`), senão corta a saída em ~1000 chars.
- **SSE da Workers AI duplica conteúdo** em dois campos (nativo e OpenAI) → texto/tool_calls duplicados → tool-error. Fix `fixEvent`+`dedupeSseStream` em `gateway.server.ts`.
- **Tool calling:** `tool()` usa `inputSchema` (não `parameters`); `stopWhen: stepCountIs(n)`. O provider só recupera chamadas "vazadas como texto" com `toolChoice` FORÇADO — forçar só no passo 0 via `prepareStep` (quem escolhe: `src/lib/ai/tool-intent.ts` `pickForcedTool`; sanitiza histórico: `leaked-tool-call.ts`).
- 4 erros de tsc PRÉ-EXISTENTES em `src/components/ai-elements/{message,shimmer}.tsx` (build passa mesmo assim).
- **Documentos primários** em base64 no D1 (tabela `documents`), "Anexo N" estável. R2 não habilitado.
- Dev: `npm run dev` (porta **3000**) emula bindings via wrangler; sem `CLOUDFLARE_API_TOKEN` cai no stub (IA/D1 não funcionam, SSR 200). `wrangler dev` serve `.output/` → rodar `npx vite build` antes. `wrangler deploy --dry-run` valida config sem token.
- **Cota Workers AI:** 10.000 neurônios/dia; esgotar → erro `4006` + stream vazio. Reset à meia-noite UTC. UX: Pracinha "cansa" (`src/lib/ai/quota.ts` + `PracinhaRest.tsx`).

## Publicações públicas (`/publicacoes`)
Autor só aparece após revisão por pares favorável: `draft → submitted → in_review → accepted → published` (ou `rejected`). Só `published` é público.
- `publications` (migration `0003`): slug único, título, resumo, palavras-chave, autor, vínculo, ORCID, `content`, parecer, datas.
- `src/lib/publication.ts` (puro, testado): `assemblePublicationContent`, `extractAbstract`, `extractKeywords`, `contentHasAbstract`, `publicationCitation`, `yearOf`.
- `publication.functions.ts`: `preparePublication`, `submitPublication`, `runPeerReview` (aceita com `ACEITO`), `publishPublication`, `list/getPublicPublication`.
- Rotas client-rendered (verificar no browser). Gestão: `PublishDialog.tsx`.

## Estado (2026-11-11)
Prod: **https://sciencechat.sciencechat.workers.dev**. **122 testes** (19 arquivos) verdes. tsc limpo (fora os 4 pré-existentes), build nitro OK.
- UX: **jornada em 5 atos** (`src/lib/journey.ts` + `JourneyRail.tsx` + `PhaseTransition.tsx`), documento ao vivo por seção, abas Chat/Documento no mobile, entrevista interrogadora com advogado do diabo fundamentado, mural de publicações (`PublishedShelf.tsx`), museu curado (`museum.ts` + `/museu`).
- Chat: voz fluida (`useVoice` + `src/lib/speech.ts`), gaveta de anexos (`ChatAttachments.tsx`), roteamento de anexo pela IA.
- Pendências: habilitar R2 (dossiê em R2), matriz de rastreabilidade, auditoria científica, config editorial Udelar, exportação DOCX/LaTeX.
