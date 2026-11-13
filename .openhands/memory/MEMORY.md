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

## Deploy (Cloudflare = alvo principal; Vercel = alternativo)
**Cloudflare é o alvo do usuário.** Deploy real feito e validado (2026-11-11):
- `npm run build` (preset `cloudflare-module`) + `npx wrangler deploy` → **https://sciencechat.sciencechat.workers.dev**. Bindings ativos: `DB` (D1), `AI` (Workers AI), `ASSETS`. Fluxo E2E validado em produção (cadastro→D1, entrevista com IA, plano, página por página, documento mestre).
- Credenciais usadas: `CLOUDFLARE_API_TOKEN` (token `cfut_...`, escopo Workers/D1/AI) + `CLOUDFLARE_ACCOUNT_ID=e0bc773c8694ee0d7eda3c4549878d52`. D1 `sciencechat` = `b8793250-696e-4538-aa50-03796ff8635f`.
- **R2 não habilitado** na conta (erro 10042 "enable R2 through the Dashboard"). O token NÃO tem escrita em KV (só leitura). KV/R2 estão declarados em `wrangler.toml` (comentados) mas AINDA não são usados no código — sessões ficam no D1. Só serão necessários para o dossiê documental (upload em R2).
- Vercel (alternativo) também funciona: projeto `sciencechat`, domínio `sciencechat.vercel.app`. Push na `main` dispara deploy. Detalhes e armadilhas (Node 24, SSO) abaixo.

### Vercel (caminho alternativo, mesmo código)
O Vercel não tem bindings, então o app fala com a Cloudflare por REST.
- `src/lib/cf/d1-rest.server.ts`: adaptador D1 sobre a API REST (mesma interface de `prepare/bind/first/all/run/batch`). `bindings.server.ts` o usa quando falta o binding `DB` e há `CLOUDFLARE_ACCOUNT_ID`+`D1_DATABASE_ID`+`CLOUDFLARE_API_TOKEN`.
- `gateway.server.ts`: sem binding `AI`, usa o modo credenciais do `workers-ai-provider` (REST) com o mesmo filtro de dedup de SSE.
- `vite.config.ts`: preset nitro `vercel` quando `BUILD_TARGET=vercel`/`VERCEL=1`; senão `cloudflare-module`.
- ARMADILHA: o Vercel usa Node 22 (npm 10), que CRASHA no `npm install` deste projeto (`Cannot read properties of null (reading 'edgesOut')`, bug do arborist com `vitest`). Fixado Node 24 (`nodeVersion: "24.x"`, `engines.node >=24`, `packageManager: npm@11.21.0`). NÃO reverter para Node 22.
- ARMADILHA: projeto novo vem com SSO de deployment ligado (302 para o login da Vercel). Desativar com `PATCH /v9/projects/{p}` `{"ssoProtection":null}`. Framework deve ser `null` (não `tanstack-start-lovable`).
- Segredo: o `$GITHUB_TOKEN` do ambiente NÃO tem acesso ao repo; usar o PAT do usuário para push.

## Fluxo do produto (regra central)
Primeiro investigar (entrevista adaptativa) → depois documentar → depois auditar → depois plano aprovado → depois gerar **PÁGINA POR PÁGINA** com aprovação humana → montar documento mestre sem reescrever o aprovado. Nunca gerar o artigo inteiro de uma vez. Não exigir instituição/diploma/orientador.

## Armadilhas conhecidas
- `tsconfig`: `noImplicitReturns`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`. Não usar `return toast.error(...)`; acessar index signatures com `env["X"]`; não passar `undefined` explícito em props opcionais (spread condicional).
- **Truncagem de texto (Workers AI):** o `workers-ai-provider` só envia `max_tokens` quando `maxOutputTokens` é passado ao `streamText`; sem ele a IA usa um padrão baixo e corta a saída no meio da frase (~1000 chars). Sempre passar `maxOutputTokens` (hoje `DEFAULT_MAX_OUTPUT_TOKENS = 2048` em `src/lib/ai/gateway.server.ts`).
- 4 erros de tsc PRÉ-EXISTENTES (não nossos) em `src/components/ai-elements/{message,shimmer}.tsx`. `npm run build` passa mesmo assim.
- **Tool calling (AI SDK v7 + Workers AI)**: `tool()` usa `inputSchema` (não `parameters`); loops multi-step com `stopWhen: stepCountIs(n)`. As tools do Pracinha (`src/lib/ai/tools.server.ts`) têm poder real sobre a folha (título, páginas) e pesquisam bases públicas (OpenAlex→Crossref, `research.server.ts`).
- **SSE da Workers AI duplica conteúdo em DOIS campos**: nativo (`{response, tool_calls}`) e OpenAI (`{choices[0].delta.{content,tool_calls}}`). O `workers-ai-provider` lê os dois → texto duplicado por token E argumentos de tool duplicados → JSON inválido → `tool-error` → a ferramenta nunca executa (o modelo "vaza" a chamada como texto no chat). Fix em `gateway.server.ts` (`fixEvent` + `dedupeSseStream`): quando `choices[0].delta` existe, apagar `parsed.response` E `parsed.tool_calls`. Vale para o binding (AI) e para o modo REST. Testar com `streamText` real + `fullStream` (não dá para importar `.ts` no node puro — inline a função).
- **Documentos primários** ficam em base64 no D1 (tabela `documents`, migration `0002`), com numeração estável "Anexo N". R2 ainda não habilitado — não usar R2 sem antes habilitar no painel.
- Dev server (`npm run dev`, porta **3000**) tenta emular bindings via wrangler. Sem `CLOUDFLARE_API_TOKEN` no ambiente ele cai no stub e a IA/D1 não funcionam; o SSR das páginas continua 200. Para bindings reais em dev: exportar `CLOUDFLARE_API_TOKEN` + `npm run preview:cf`.
- `wrangler deploy --dry-run` valida a config sem token.

## Área pública de publicações (2026-11-11)
Regra do produto: **o autor só aparece na área pública depois de submeter à revisão por pares e receber parecer favorável**. Fluxo: `draft → submitted → in_review → accepted → published` (ou `rejected`). Só `status='published'` aparece em `/publicacoes`.
- Tabela `publications` (migration `0003_publications.sql`, já aplicada no D1 remoto → 7 tabelas). Guarda `slug` único, título, resumo, palavras-chave, autor, vínculo, ORCID, `content` (texto integral), parecer (`review_report`) e datas.
- `src/lib/cf/repo.server.ts`: CRUD + `uniqueSlug` + `setPublicationStatus`.
- `src/lib/publication.ts` (puro, testado): `assemblePublicationContent`, `extractAbstract` (remove a linha de palavras-chave), `extractKeywords`, `contentHasAbstract`, `publicationCitation`, `yearOf`.
- `src/lib/publication.functions.ts`: `preparePublication` (monta das páginas aprovadas), `submitPublication`, `runPeerReview` (Pracinha como revisor → prompt `PEER_REVIEW_INSTRUCTIONS`; aceita quando o parecer traz `ACEITO`), `publishPublication`, `listPublicPublications`/`getPublicPublication` (público), `getArticlePublication`.
- Rotas públicas: `src/routes/publicacoes/index.tsx` e `$slug.tsx` (renderizam Markdown via `MessageResponse`). UI de gestão: `src/components/app/PublishDialog.tsx` (botão "Publicar" no header do workspace).
- Seed da 1ª publicação: `docs/publicacoes/sciencechat-artigo.md` + `scripts/seed-publication.mjs` (gera SQL; slug `sciencechat-producao-cientifica-independente`).
- Rotas são client-rendered (`useEffect` + server fn), então `curl` não mostra o conteúdo; verificar no browser.

## Estado (2026-11-11, fim do dia)
Publicado na Cloudflare: **https://sciencechat.sciencechat.workers.dev** (D1 + Workers AI por binding). 91 testes passando. Feito hoje: fix do tool calling (dedup de `tool_calls` no SSE), área pública de publicações (`/publicacoes`) com revisão por pares e portão de publicação, o 1º artigo publicado sobre o próprio ScienceChat, **UX mobile (abas Chat/Documento)**, **entrevista interrogadora** (prompts) e **documento ao vivo organizado por seção**. Commits `15f4a0b` → `7d391a8` (HEAD). Deploy prod: versão `f816501b`.

### Fix do tool calling (narração em vez de execução)
O `workers-ai-provider@4` só RECUPERA chamadas "vazadas como texto" quando `toolChoice` é FORÇADO. Com histórico longo o llama-3.3 narra a chamada e a ferramenta nunca executa. Fix: forçar a ferramenta **só no passo 0** via `prepareStep` (`{toolChoice:{type:"tool",toolName}}`), voltando a `auto` depois (forçar em todos os passos causa loop de 5). Quem escolhe a ferramenta: `src/lib/ai/tool-intent.ts` (`pickForcedTool`). Sanitização do histórico: `src/lib/ai/leaked-tool-call.ts`.
**Cota Workers AI:** conta free = 10.000 neurônios/dia; ao esgotar retorna erro `4006` e stream vazio ("No output generated"). Reset diário à meia-noite UTC — não confundir com bug. UX: o Pracinha "cansa" (`src/lib/ai/quota.ts` + `PracinhaRest.tsx`), mostra relógio com a hora de volta e trava o chat até renovar.

### UX mobile
`src/routes/a/$articleId.tsx` usa `useIsMobile()` + abas fixas no rodapé (Chat/Documento); `ChatDock` ganha `isMobile`/`mobileVisible`/`onMobileClose` e vira tela cheia (`fixed inset-0`) no celular. Ambos permanecem montados (não perde estado).

### Entrevista interrogadora e documento vivo
`INTERVIEW_INSTRUCTIONS` faz a IA interrogar (teoria/problema → testa a tese → descobre teórica vs empírica → fecha lacunas) e usar `pesquisar_bases` para comprovar. `interview-notes.ts` (`sectionForQuestion`/`groupNotesBySection`) classifica pergunta→seção; `DocumentCanvas.preliminaryDocument` monta o A4 por seção durante a entrevista.

Pendências de produto: dossiê documental (precisa habilitar R2 no painel Cloudflare), matriz de rastreabilidade, auditoria científica, config editorial Udelar, exportação DOCX/LaTeX.

### Jornada científica em 5 atos (UX)
`src/lib/journey.ts` é a espinha dorsal da UX: atos Ignição → Interrogatório → Estrutura → Produção → Obra, cada um com tagline emocional, cor (oklch) e ícone. `journeyIndex()`/`journeyPercent()` derivam o ato de `phase` + progresso real (páginas aprovadas, draft, razão da entrevista). `JourneyRail.tsx` substitui o antigo Badge de fase no header do workspace; `PhaseTransition.tsx` mostra uma cortina breve ao mudar de ato. `ChatDock` troca frases de "pensando" (entrevista x produção) enquanto `busy`. A landing (`routes/index.tsx`) cria artigo com uma "inquietação" inicial que vira a 1ª mensagem via `?seed=` (validado em `validateSearch` de `a/$articleId.tsx`, consumido no `ChatDock`).
