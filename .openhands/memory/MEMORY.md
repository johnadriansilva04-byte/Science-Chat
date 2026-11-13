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
- Schema D1 em `migrations/` (`0001_init`, `0002_documents`, `0003_publications`, `0004_documents_r2`). `npm run db:migrate:local|remote`.
- Usar `npm` (sem bun). `package-lock.json` não é versionado.

## Deploy
**Cloudflare é o alvo.** `npm run build` + `npx wrangler deploy` → **https://sciencechat.sciencechat.workers.dev**. Bindings ativos: `DB`, `AI`, `FILES` (R2), `ASSETS`. E2E validado em produção.
- `CLOUDFLARE_ACCOUNT_ID=e0bc773c8694ee0d7eda3c4549878d52`; D1 `sciencechat` = `b8793250-696e-4538-aa50-03796ff8635f`. **R2 habilitado** (o usuário ativou no painel); bucket `sciencechat-files` (binding `FILES`). KV só leitura. Sessões ficam no D1.
- **Push GitHub**: `$GITHUB_TOKEN` (`ghu_`) e `OH_GIT_CREDENTIAL_ACCESS_TOKEN_GITHUB` dão **403 mesmo com admin via API** — o token ativo não escreve. O único que funciona é `GH_PAT` (`ghp_`, no ambiente):
  `git -c credential.helper= push "https://${GH_PAT}@github.com/johnadriansilva04-byte/Science-Chat.git" main`
  Antes: `git fetch origin -q` + confirmar fast-forward. Repo é **shallow**; NUNCA rebase/force-push.
- Vercel é caminho alternativo (mesmo código, via REST): detalhes no log diário (Node 24 obrigatório, desligar SSO).

## Fluxo do produto (regra central)
Investigar (entrevista adaptativa) → documentar → auditar → plano aprovado → gerar **PÁGINA POR PÁGINA** com aprovação humana → montar documento mestre sem reescrever o aprovado. Nunca gerar o artigo inteiro de uma vez. Não exigir instituição/diploma/orientador.

## Armadilhas conhecidas
- `tsconfig`: `noImplicitReturns`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`. Não usar `return toast.error(...)`; index signatures com `env["X"]`; sem `undefined` explícito em props opcionais (spread condicional).
- **Truncagem (Workers AI):** sempre passar `maxOutputTokens` ao `streamText` (`DEFAULT_MAX_OUTPUT_TOKENS = 2048` em `gateway.server.ts`), senão corta a saída em ~1000 chars.
- **SSE da Workers AI duplica conteúdo** em dois campos (nativo e OpenAI) → texto/tool_calls duplicados → tool-error. Fix `fixEvent`+`dedupeSseStream` em `gateway.server.ts`.
- **Tool calling:** `tool()` usa `inputSchema` (não `parameters`); `stopWhen: stepCountIs(n)`. O provider só recupera chamadas "vazadas como texto" com `toolChoice` FORÇADO — forçar só no passo 0 via `prepareStep` (quem escolhe: `src/lib/ai/tool-intent.ts` `pickForcedTool`; sanitiza histórico: `leaked-tool-call.ts`).
- 4 erros de tsc PRÉ-EXISTENTES em `src/components/ai-elements/{message,shimmer}.tsx` (build passa mesmo assim).
- **Documentos primários (dossiê):** arquivo bruto no **R2** (`documents.storage_key`, bucket `sciencechat-files`), base64 no D1 apenas como fallback. Camada `src/lib/cf/storage.server.ts` (`putDocumentBytes`/`readDocumentBytes`/`deleteDocumentBytes`), "Anexo N" estável. `getDocumentFile` devolve o original em base64 (abrir/baixar).
- Dev: `npm run dev` (porta **3000**) emula bindings via wrangler; sem `CLOUDFLARE_API_TOKEN` cai no stub (IA/D1 não funcionam, SSR 200). `wrangler dev` serve `.output/` → rodar `npx vite build` antes. `wrangler deploy --dry-run` valida config sem token.
- **Cota Workers AI:** 10.000 neurônios/dia; esgotar → erro `4006` + stream vazio. Reset à meia-noite UTC. UX: Pracinha "cansa" (`src/lib/ai/quota.ts` + `PracinhaRest.tsx`).

## Rastreabilidade, auditoria, editorial e exportação (2026-11-11)
Migration `0005_audit_traceability_editorial.sql`: tabelas `claims`, `claim_evidence`, `audits`, `editorial_configs`. Repo: `src/lib/cf/repo.server.ts` (seção nova: `listClaims/addClaim/updateClaim/clearClaims`, `listEvidence/addEvidence/deleteEvidence`, `addAudit/listAudits`, `getEditorialConfig/upsertEditorialConfig`).
- **Módulos puros (testados):** `src/lib/traceability.ts` (extração de afirmações, `overlapRatio`/`bestExcerpt`/`matchDegree`, `claimStateFor` — ausência de doc NUNCA vira "falsa", vira `nao_localizada`/`nao_verificavel`), `src/lib/audit.ts` (integridade textual + coerência + documental, gera relatório MD), `src/lib/editorial.ts` (destino Udelar/outra/independente, normas, `formatReference`, `requirementsFor` com nível `verificar` — nunca inventa norma da Udelar), `src/lib/docx.ts` (ZIP/OOXML store sem deps: `crc32`, `zipStore`, `buildDocx`), `src/lib/export-formats.ts` (`markdownToLatex`, `markdownToHtml`).
- **Server fns:** `traceability.functions.ts`, `audit.functions.ts`, `editorial.functions.ts`, `export.functions.ts` (`buildExport` → docx/latex/html/md/txt; `buildDossier` → dossiê+matriz como produto separado).
- **UI:** `TraceabilityPanel`, `AuditPanel`, `EditorialPanel`, `ExportDialog`; painel lateral do `DocumentCanvas` agora tem 6 abas (Plano/Produção/Anexos/Rastreabilidade/Auditoria/Editorial); botão **Exportar** substitui os antigos .md/.txt.
- **Migração com ledger:** `scripts/db-migrate.mjs` (`npm run db:migrate:local|remote`) registra em `schema_migrations`; evita reexecutar as destrutivas.
- **Landing redesenhada:** `src/routes/index.tsx` — tela única `h-screen overflow-hidden`, 2 colunas (promessa+CTA | 4 mecanismos+estante), brilho que segue o ponteiro, shimmer, cards animados. CSS em `styles.css` (`.landing-*`).

## Publicações públicas (`/publicacoes`)
Autor só aparece após revisão por pares favorável: `draft → submitted → in_review → accepted → published` (ou `rejected`). Só `published` é público.
- `publications` (migration `0003`): slug único, título, resumo, palavras-chave, autor, vínculo, ORCID, `content`, parecer, datas.
- `src/lib/publication.ts` (puro, testado): `assemblePublicationContent`, `extractAbstract`, `extractKeywords`, `contentHasAbstract`, `publicationCitation`, `yearOf`.
- `publication.functions.ts`: `preparePublication`, `submitPublication`, `runPeerReview` (aceita com `ACEITO`), `publishPublication`, `list/getPublicPublication`.
- Rotas client-rendered (verificar no browser). Gestão: `PublishDialog.tsx`.

## Estado (2026-11-11)
Prod: **https://sciencechat.sciencechat.workers.dev**. **168 testes** (25 arquivos) verdes. tsc limpo (fora os 4 pré-existentes), build nitro OK. Deploy feito.
- UX: **jornada em 5 atos** (`src/lib/journey.ts` + `JourneyRail.tsx` + `PhaseTransition.tsx`), documento ao vivo por seção, abas Chat/Documento no mobile, entrevista interrogadora com advogado do diabo fundamentado, mural de publicações (`PublishedShelf.tsx`), museu curado (`museum.ts` + `/museu`).
- Chat: voz fluida (`useVoice` + `src/lib/speech.ts`), gaveta de anexos (`ChatAttachments.tsx`), roteamento de anexo pela IA.
- **R2 do dossiê:** feito e validado em produção (upload→R2, download, delete). Ver log `2026-11-11.md`.
- **Matriz de rastreabilidade, auditoria científica, config editorial Udelar e exportação DOCX/LaTeX/HTML:** feitos e validados em produção (seção acima). As 4 pendências anteriores estão concluídas.
- Migration `0005` aplicada no D1 remoto (ledger `schema_migrations` com 5 entradas); 7 artigos preservados.
