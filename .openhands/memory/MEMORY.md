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
- `CLOUDFLARE_ACCOUNT_ID=e0bc773c8694ee0d7eda3c4549878d52`; D1 `sciencechat` = `b8793250-696e-4538-aa50-03796ff8635f`; R2 `sciencechat-files` (`FILES`); **KV ativo**: namespace `sciencechat_kv` = `bf18af0db8dc44ca9e762875c69843c4` (`KV`, usado pelo rate limit). Sessões ficam no D1.
- **Rate limit** (`src/lib/cf/rate-limit.server.ts`, janela fixa alinhada; KV com fallback D1 `rate_limits`): chat 40/5min, login 10/15min (IP+e-mail), cadastro 20/h. Falha ABERTO. Validado em prod.
- **Bundle**: usar Shiki fine-grained (`src/lib/syntax-highlight.ts`, 20 langs) e Mermaid lazy (`src/lib/mermaid-lazy.ts`); NUNCA reimportar `@streamdown/code`/`@streamdown/mermaid` (puxam ~13 MB e estouram o limite de 3 MB do Worker).
- **Push GitHub**: `$GITHUB_TOKEN` (`ghu_`, GitHub App) e `OH_GIT_CREDENTIAL_ACCESS_TOKEN_GITHUB` dão **403** mesmo com admin via API. Só funciona com PAT clássico `ghp_` (o `GH_PAT` some do ambiente às vezes):
  `git -c credential.helper= push "https://${GH_PAT}@github.com/johnadriansilva04-byte/Science-Chat.git" main`
  Antes: `git fetch origin -q` + confirmar fast-forward. Repo é **shallow**; NUNCA rebase/force-push.
- Vercel é caminho alternativo (mesmo código, via REST): detalhes no log diário (Node 24 obrigatório, desligar SSO).

## Fluxo do produto (regra central)
Investigar (entrevista adaptativa) → documentar → auditar → plano aprovado → gerar **PÁGINA POR PÁGINA** com aprovação humana → montar documento mestre sem reescrever o aprovado. Nunca gerar o artigo inteiro de uma vez. Não exigir instituição/diploma/orientador.

## Armadilhas conhecidas
- `tsconfig`: `noImplicitReturns`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`. Não usar `return toast.error(...)`; index signatures com `env["X"]`; sem `undefined` explícito em props opcionais (spread condicional).
- **Truncagem (Workers AI):** sempre passar `maxOutputTokens` ao `streamText` (`DEFAULT_MAX_OUTPUT_TOKENS = 2048` em `gateway.server.ts`), senão corta a saída em ~1000 chars.
- **OCR de PDF digitalizado:** scanners/ReportLab embutem a página como **pixels crus** (RGB/cinza) com `/FlateDecode` e SEM cabeçalho PNG/JPEG → `sniffImageMime` falha e a imagem era descartada (OCR nunca rodava). `decodeImageStream` agora reempacota em PNG (`wrapRawImageAsPng`, IHDR+IDAT+IEND; zlib via `CompressionStream`; CRC de `docx.ts`). Formatos ainda NÃO suportados: JPEG 2000 (`/JPXDecode`), fax CCITT, JBIG2 (aviso acionável via `detectUnsupportedPdfImages`).
- **Página A4:** comporta ~500 palavras. `PAGE_INSTRUCTIONS` pede 4–6 parágrafos, 450–550 palavras, sem repetição; `normalizePageText()` (article-page.ts) deduplica frases (Jaccard ≥0.75) e reflui blocos gigantes. Página de 618 palavras transbordava ("trecho maior que uma folha A4").
- **SSE da Workers AI duplica conteúdo** em dois campos (nativo e OpenAI) → texto/tool_calls duplicados → tool-error. Fix `fixEvent`+`dedupeSseStream` em `gateway.server.ts`.
- **Tool calling:** `tool()` usa `inputSchema` (não `parameters`); `stopWhen: stepCountIs(n)`. O provider só recupera chamadas "vazadas como texto" com `toolChoice` FORÇADO — forçar só no passo 0 via `prepareStep` (quem escolhe: `src/lib/ai/tool-intent.ts` `pickForcedTool`; sanitiza histórico: `leaked-tool-call.ts`). O vazamento AO VIVO (texto cru no chat) é cortado por um transform de stream: `experimental_transform` em `startResponses` → `stripLeakedCallsTransform` usa `drainLeakedCalls` (`src/lib/ai/leak-filter.ts`). Histórico e stream precisam das DUAS limpezas.
- **Anexos no chat:** `ler_todos_anexos` lê tudo numa passada (teto ~16k chars); `pickForcedTool` dispara em verbos de leitura (leia/leu/olhe/analise) e na entrevista também forçamos leitura de anexos (não só `pesquisar_bases`).
- 4 erros de tsc PRÉ-EXISTENTES em `src/components/ai-elements/{message,shimmer}.tsx` (build passa mesmo assim).
- **Documentos primários (dossiê):** arquivo bruto no **R2** (`documents.storage_key`, bucket `sciencechat-files`), base64 no D1 apenas como fallback. Camada `src/lib/cf/storage.server.ts` (`putDocumentBytes`/`readDocumentBytes`/`deleteDocumentBytes`), "Anexo N" estável. `getDocumentFile` devolve o original em base64 (abrir/baixar).
- Dev: `npm run dev` (porta **3000**) emula bindings via wrangler; sem `CLOUDFLARE_API_TOKEN` cai no stub (IA/D1 não funcionam, SSR 200). `wrangler dev` serve `.output/` → rodar `npx vite build` antes **e reiniciar o `wrangler dev`** (senão assets com hash novo dão 404 → chunk JS → tela "didn't load"). No ambiente Agent Canvas o servidor local roda em `wrangler dev --local --port 12000` (link work-1). `wrangler deploy --dry-run` valida config sem token.
- **Cota Workers AI:** 10.000 neurônios/dia; esgotar → erro `4006` + stream vazio. Reset à meia-noite UTC. UX: Pracinha "cansa" (`src/lib/ai/quota.ts` + `PracinhaRest.tsx`).
- **Chat edita páginas (`api/chat.ts`):** contexto = plano + `documentContext()` (conteúdo atual das páginas). Caminhos, em ordem (fase ≠ interview): 1) `parsePageCommand` (conteúdo LITERAL → grava direto); 2) `parseRewriteRequest` → `runPageRewrite` (reescrita gerativa pelo **motor da aba Produção**); 3) modelo. **Armadilha:** `llama-3.3-70b` perde acentos e TRUNCA o JSON quando escreve texto longo DENTRO de tool call — por isso reescritas longas usam `generateFinalText` (texto puro), nunca tool call. Delimitadores literais: `palavra exata:`, `texto exato:`, `exatamente:`, `conteúdo=`. Limites: `parsePageCommand` ≤1200 chars, `parseRewriteRequest` ≤800.
- **Remote git real:** `github.com/johnadriansilva04-byte/Science-Chat.git` (via PAT; não existe `ScienceChat-org/science-chat`).

## Rastreabilidade, auditoria, editorial e exportação (2026-11-11)
Migration `0005_audit_traceability_editorial.sql`: tabelas `claims`, `claim_evidence`, `audits`, `editorial_configs`. Repo: `src/lib/cf/repo.server.ts` (seção nova: `listClaims/addClaim/updateClaim/clearClaims`, `listEvidence/addEvidence/deleteEvidence`, `addAudit/listAudits`, `getEditorialConfig/upsertEditorialConfig`).
- **Módulos puros (testados):** `src/lib/traceability.ts` (extração de afirmações, `overlapRatio`/`bestExcerpt`/`matchDegree`, `claimStateFor` — ausência de doc NUNCA vira "falsa", vira `nao_localizada`/`nao_verificavel`), `src/lib/audit.ts` (integridade textual + coerência + documental, gera relatório MD), `src/lib/editorial.ts` (destino Udelar/outra/independente, normas, `formatReference`, `requirementsFor` com nível `verificar` — nunca inventa norma da Udelar), `src/lib/docx.ts` (ZIP/OOXML store sem deps: `crc32`, `zipStore`, `buildDocx`), `src/lib/export-formats.ts` (`markdownToLatex`, `markdownToHtml`).
- **Server fns:** `traceability.functions.ts`, `audit.functions.ts`, `editorial.functions.ts`, `export.functions.ts` (`buildExport` → docx/latex/html/md/txt; `buildDossier` → dossiê+matriz como produto separado).
- **UI:** `TraceabilityPanel`, `AuditPanel`, `EditorialPanel`, `ExportDialog`; painel lateral do `DocumentCanvas` agora tem 6 abas (Plano/Produção/Anexos/Rastreabilidade/Auditoria/Editorial); botão **Exportar** substitui os antigos .md/.txt.
- **Migração com ledger:** `scripts/db-migrate.mjs` (`npm run db:migrate:local|remote`) registra em `schema_migrations`; evita reexecutar as destrutivas.
- **Home redesenhada (2026-11-16):** `src/routes/index.tsx` — hero centralizado (promessa + CTA `Começar meu artigo`), depois o **trilho dos 5 atos** (`JOURNEY_ACTS`), depois o Acervo (`PublishedShelf`, só nomes em chips) e o rodapé. Removidos os 4 cards de "mecanismos" e o CSS `.landing-card*`. Fonte do trilho: `src/lib/journey.ts`.
- **AcervoCard/`acervo-card`:** CSS de cartões e ficha (modal) do acervo em `styles.css`.
- **Landing (histórico):** a versão antiga era `h-screen overflow-hidden` 2 colunas com cards animados.

## Acervo (`/publicacoes`) — revisão só com prova (2026-11-16)
**Regra:** a plataforma NÃO revisa. O selo "revisado por pares" só aparece quando o autor comprova (DOI/registro + documento). Removido o `runPeerReview`/`submitPublication` falsos.
- `publications` (migration `0003` + `0007`): `status = draft|published`; `review_status = nao_revisado|revisado`; campos `doi`, `review_report`, `review_notes`. `repo.server.ts`: `setReviewProof`, `setPublicationStatus`, `upsertPublication`.
- `src/lib/acervo.ts` (puro, testado): junta **clássicos do Museu** (`museum.ts`, 30 obras, DOI real, `reviewed:false` — NÃO são "revisados por pares" da plataforma) + **contribuições** publicadas; `buildAcervo` → `{classicsByWing, reviewed, notReviewed, counts}`.
- `/publicacoes` = **Acervo**: 3 coleções na MESMA página (Clássicos do Museu por ala · Revisados por pares · Ainda não revisados), com busca e chips. `AcervoCard.tsx` = cartão + ficha em modal. Home (`PublishedShelf.tsx`) = vitrine das 3 coleções.
- `src/lib/publication.ts`: `yearOf`, `extractAbstract`, `extractKeywords`, `contentHasAbstract`, `publicationCitation`, `assemblePublicationContent`. (`splitByReview` removido.) `publication.functions.ts`: publish direto + fluxo de comprovação (`base64ToBytes`).
- Rotas client-rendered (verificar no browser). Gestão: `PublishDialog.tsx`.

## Estado (2026-11-16)
Prod: **https://sciencechat.sciencechat.workers.dev**. **260 testes** (34 arquivos) verdes; tsc 0 erros; eslint 0 erros (14 warnings react-refresh do shadcn). Build nitro OK. Deploy feito.
- UX: **jornada em 5 atos** (`src/lib/journey.ts` + `JourneyRail.tsx` + `PhaseTransition.tsx`), documento ao vivo por seção, abas Chat/Documento no mobile, entrevista interrogadora, **Acervo** (`acervo.ts` + `AcervoCard.tsx` + `PublishedShelf.tsx`), museu (`museum.ts` + `/museu`). Chat: voz (`useVoice` + `speech.ts`), gaveta de anexos (`ChatAttachments.tsx`).
- Migrations aplicadas no D1 remoto: `0001`–`0007` (ledger `schema_migrations`). Logs diários: `2026-11-11.md`, `2026-11-15.md`.
- ⚠️ **Push GitHub:** o `GITHUB_TOKEN` do ambiente e o `OH_GIT_CREDENTIAL_ACCESS_TOKEN_GITHUB` vêm **sem escopo de escrita** (`x-oauth-scopes` vazio) → 403 mesmo sendo o dono do repo. Para publicar, usar um PAT com escopo `repo` (o usuário forneceu um em 2026-11-16 e o push passou). Deploy Cloudflare OK via `CLOUDFLARE_API_TOKEN` no ambiente.

## Extração de documentos e visão (resumo)
- `src/lib/documents.server.ts` descomprime DOCX (ZIP deflate) e PDF (`/FlateDecode`, `/ASCII85Decode`) via `DecompressionStream` — **assíncrono**; ⚠️ `Blob.stream()` NÃO existe no jsdom (usar `ReadableStream`+`pipeThrough`).
- **Imagens/PDF digitalizado:** `uploadDocument` descreve via visão (`AI_VISION_MODEL` = `llama-3.2-11b-vision`); PDF sem texto → `extractPdfImages()` + `describePdfImages()`. Não cobre `/JPXDecode` (JPEG2000) nem CCITT/fax. `ler_anexo` tenta visão sob demanda se faltar texto.
- **Degeneração de página:** `dedupeParagraphs` (Jaccard≥0.8) no `generatePage`. Página A4 ≈ 500 palavras; `PAGE_INSTRUCTIONS` + `normalizePageText()`.

## Homenagens do ScienceChat (2026-11-16)
- `ACERVO_HOMAGES` em `src/lib/acervo.ts`: mapa slug→{honoree, dedication}. Artigos da comunidade elevados a tributo; **saem** de revisados/não-revisados e viram `acervo.homages`.
- Hoje: `calculo-mental-sem-papel-adaptacao-cognitiva-hawking` → homenagem a Stephen Hawking (1942–2018).
- UI: `HomageBanner` (faixa dourada + chama) em `/publicacoes`; faixa compacta `.acervo-mural__homage` no `PublishedShelf` (home); dedicatória em `$slug.tsx`.
- **D1 local ≠ D1 de produção.** Produção hoje tem **uma única conta real**: `variantfeb@gmail.com` (senha não registrada aqui). Contas `@sciencechat.local` existem só no D1 local — nunca usar em teste de produção.

## Formatação por norma + modo livro (2026-11-16)
- **`src/lib/format-profile.ts` (novo):** `FormatProfile` por `CitationStandard` — centraliza fonte, margens (por lado), entrelinha, recuo, citações e referências. **ABNT (NBR 14724)** é o default: Times New Roman 12, 1,5, justificado, recuo 1,25 cm, margens 3 cm (topo/esq) / 2 cm (base/dir), nº de página no topo direito. Exporta `formatProfile`, `lineToTwips`, `mmToTwips`, `ptToHalfPoints`.
- **A norma NÃO é fixa:** vem da config editorial (`standard: "abnt"|"apa"|"ieee"|"udelar"…`). O código apenas lê e aplica — nunca cravar ABNT. `docx.ts`, `export-formats.ts`, `export.functions.ts`, `a4.ts`, `A4Sheet.tsx` são profile-aware.
- **`a4.ts` mudou de API:** margens agora por lado (`A4.leftMm/rightMm/topMm/bottomMm`), não `marginXMm/marginYMm`.
- **`BookReader`** aceita `pages?` (produção) **ou** `content?` (publicação, dividido por seções via `splitContentIntoLeaves` em `publication.ts`). Folha longa rola (`max-h-[82vh] overflow-y-auto`) — antes era recortada. Aberto por "Ler o ensaio" (faixa de homenagem) e por "Ler como livro" em `/publicacoes/$slug`.

## Correções da rodada no chat real (2026-11-16)
Testei o fluxo completo pela UI (conta `variantfeb`). Erros anotados e corrigidos (detalhes no log `2026-11-16.md`):
- **Contador "5/4":** `interview-progress.ts` contava toda msg `user` como resposta → teto `answered ≤ asked − skipped`.
- **Seção errada:** `interview-notes.ts` regra de Conclusão casava "considerar"; agora só "consideraç".
- **RAG silencioso:** OpenAlex responde **429** (cota gratuita diária esgotada) e o código caía no Crossref **sem avisar**. `research.server.ts` agora lança `RateLimitedError` (429/403), `searchLiterature` devolve `{hits, degraded, source}` e `formatHits(hits, degraded)` injeta aviso. Chave opcional `OPENALEX_API_KEY` (Env + `bindings.server.ts`).
- **Título:** `repo.createArticle(userId, title?)` + server fn aceitam título; `ArticlesMenu.createArticle` usa o seed da home como título inicial (antes ficava "Novo artigo").
- ⚠️ **Workers AI cota diária (erro 4006)** esgota rápido (10k neurons grátis); reseta meia-noite UTC — bloqueia testar IA no fim do dia.
- **Aviso:** digitar texto longo com `\n` na UI envia várias mensagens (Enter = enviar). Ao automatizar via browser, usar Shift+Enter ou colar.

## Deploy & push (importante)
- **`npm run deploy` exige `CLOUDFLARE_API_TOKEN` (secret `cfat_*`) + `CLOUDFLARE_ACCOUNT_ID=e0bc773c8694ee0d7eda3c4549878d52`.** Sem ele o build roda mas **não publica** — foi assim que a produção ficou servindo build antigo (sintoma "modo livro corta o texto", 16/11: prod era anterior ao commit do recurso). Sempre conferir o **Version ID novo** no `wrangler deploy` e validar no navegador.
- **Push GitHub:** token do remote / `GITHUB_TOKEN` / `OH_GIT_CREDENTIAL_ACCESS_TOKEN_GITHUB` são **read-only (403)**. Usar o **`GH_PUSH_TOKEN`** (escopo `repo`) sem gravar no remote:
  `git -c credential.helper= push "https://x-access-token:${GH_PUSH_TOKEN}@github.com/johnadriansilva04-byte/Science-Chat.git" main`
- **Modo livro (`BookReader`):** overlay `overflow-y-auto` + wrapper `min-h-full … justify-center`; cada folha `max-h-[82vh] overflow-y-auto` (rola, nunca corta). Teste de regressão em `book-reader.test.tsx`.

## Pré-textuais ABNT + bug do proxy AI local (2026-11-17)
- **Chat quebrava no dev local (CORRIGIDO):** `AI_APICallError: Cannot stringify arbitrary non-POJOs` / `DevalueError`. O provider repassa `options.abortSignal` (não-POJO) ao `binding.run`, e no dev o binding `AI` é um **proxy stub do miniflare que serializa com devalue** (recusa não-POJO). Em produção não ocorre. Correção: `serializableRunOptions()` em `src/lib/ai/gateway.server.ts` remove a chave `signal` antes de `ai.run`. Testes em `ai-stream.test.ts`. ⚠️ Sintoma no dev local: qualquer envio de chat falha; checar `DevalueError` no log do wrangler.
- **Pré-textuais (capa + folha de rosto):** `src/lib/front-matter.ts` (puro, testado) — `DocumentMeta`, `buildFrontMatter`, `frontMatterBlocks`, `frontMatterSequence`, `frontMatterMarkdown`, `numberSections` (1, 1.1). `Block` ganhou `pagebreak` e `frontmatter` (cover/titlepage); DOCX/HTML/LaTeX/A4Sheet renderizam. `format-profile.ts`: ABNT/APA `frontMatter:true`; ABNT `numberedSections:true`.
- **Identificação do trabalho** fica em `editorial_configs.layout_json` (migration `0006_editorial_layout.sql`), editada no card "Identificação do trabalho" do `EditorialPanel`. Exportação usa `omitTitle` para não repetir o H1 quando há capa.
- Estado 17/11: **323 testes** (37 arquivos), `tsc` 0, `eslint` 0 erros (14 warnings), build OK. Cota Workers AI **esgotada** (4006) → não dá para refazer o fluxo de IA no fim do dia.

## Card educativo + correções no chat (2026-11-18)
- **Card "Ciência sem crachá" na home:** `src/lib/science-access.ts` (puro/testado) + `ScienceAccessCard.tsx` (recolhido na home, abre em `Dialog`). Ensina, com 10 passos e fontes oficiais reais, que publicar artigo NÃO exige vínculo/diploma/orientador. Caminhos Brasil (Lattes, ABNT, SciELO) e Uruguai (Udelar, revistas Udelar, ANII). Detalhes no log `2026-11-18.md`.
- **`isQuotaError` (CORRIGIDO):** não confundir mais 429/"rate limit" com a cota diária (4006). Antes, um 429 travava o chat até a meia-noite UTC via `setRestedAt(nextQuotaReset())`. Padrões agora exigem sinal de cota real (`neurons`/`4006`/`daily free allocation`/`quota exceeded`).
- **`cleanQuestion` (CORRIGIDO):** trunca em 300 preservando o `?` final — o corte em 200 arrancava o `?` e quebrava o pareamento pergunta/resposta em `interviewNotes` (virava "Informação fornecida").
- **`suggestReplies` (CORRIGIDO):** removido o `e` solto do alternante sim/não (casava a conjunção "E…" por causa do `normalize` sem acento).
- Estado 18/11: **342 testes** (39 arquivos), `tsc` 0, `eslint` 0 erros (14 warnings), build OK.
- **Card também no Museu e na Coletânea**; seção "posso publicar?" com provas oficiais (`DIRECT_ANSWER_POINTS`); abas Brasil/Uruguai/Internacional; botão "Levar isso para o Pracinha" via callback `onUseGuide` (a home preenche o input `idea`; Museu/Coletânea criam o artigo). Estado final: **347 testes**, tsc 0, eslint 0 erros, build OK.
- **Fontes que não respondem a curl (não linkar):** journals.udelar.edu.uy e portal.udelar.edu.uy (DNS), periodicos.capes.gov.br (403), publicationethics.org (403). Tavily sem cota (432) → usar curl.

## Mobile: overflow horizontal (2026-11-18)
- **Sintoma/truque de diagnóstico:** elemento `fixed inset-0` (ex.: `ChatDock`) aparece mais largo que a viewport. Causa quase sempre é **overflow horizontal real** que expande o layout viewport. Comparar `window.innerWidth` vs `document.documentElement.clientWidth`: se diferem, há overflow e o `body`/`html` crescem, arrastando todos os `fixed`.
- **Causa raiz corrigida:** `.journey-rail` (header do artigo) com `flex:1` encolhia a ~5px, mas o trilho era `nowrap` e transbordava → `body` com scrollWidth 429 > vw 375. Fix em `styles.css` `@media (max-width:640px)`: `.journey-rail { flex:none; width:100%; overflow:hidden }` + `.journey-rail__track { justify-content:center }`.
- **Regra geral:** todo container com filhos `nowrap` precisa de `min-width:0`/`overflow:hidden`; `fixed` não protege contra overflow do documento.
- **Rate limit local:** cadastro 20/h por IP no **KV** (não em D1); testes automatizados esgotam. Limpar: `rm -rf .wrangler/state/v3/kv/bf18af0db8dc44ca9e762875c69843c4` + reiniciar dev.

## Guia "Ciência sem crachá" na home (2026-11-18)
- `ScienceAccessCard` tem modo **`inline`** (usado na home): provas/ORCID/passos ficam **à vista**; fontes, países e carta-modelo num diálogo. Antes era só um botão compacto — a resposta existia mas ninguém descobria.
- **Cuidado com fatos sobre a Udelar:** "Apoyo a publicaciones" é para **livros** e exige cargo docente orçamentado — **não** serve para pesquisador independente. Fontes uruguaias corretas: **SciELO Uruguay** (`scielo.edu.uy`), **CVUy** (`cvuy.uy`, já integra ORCID), **Colibri**. `revistas.udelar.edu.uy` está "próximamente".
- **CAPES não é acesso livre** (IP institucional ou CAFe). SciELO é aberto.
- **Home tinha `lg:h-screen` + `overflow-hidden`**: cortava o guia no desktop (1885px em 273px). Página agora rola; guia em `lg:col-span-2`, `order-2 lg:order-3`.
- `onFinish` do `/api/chat` é blindado com try/catch (roda depois do texto ir à tela).
- Dev local exige `CLOUDFLARE_API_TOKEN`; Chrome do container é `chromium`.

## "Ciência sem crachá" em bocados (2026-11-18)
- Conteúdo vive em `SCIENCE_BITES` (`src/lib/science-flow.ts`): 6 bocados com `what`/`why`/`whatFor`. Um por vez, sob demanda — nunca despejar os 10 passos.
- `ScienceFlowCard` (chat, com `canCreate`) e `ScienceBiteStepper` (home) consomem a mesma fonte.
- **Detecção:** exige falta de credencial (vínculo/instituição/diploma/orientador). Termo acadêmico solto ("não tenho certeza do título") NÃO pode disparar.
- **Recusa persiste por artigo** (`dismissScienceFlow`/`wasScienceFlowDismissed`, localStorage, máx. 20 ids) — sem isso o card volta a cada recarga.
- Guia não usa IA → funciona com cota esgotada (4006). Criar artigo usa IA → `canCreate:false` avisa em vez de falhar.
- Ao citar normas, checar por `curl` na fonte oficial: ICMJE (4 critérios, nenhum exige instituição) e DOAJ confirmados. Tavily pode estar sem cota.

## Login: como diagnosticar "senha inválida" (2026-11-18)
- **O login não estava quebrado.** Antes de suspeitar de código/tabela, prove qual conta e senha estão em jogo: `verifyLogin` só lê `users` (não existe outra tabela), PBKDF2-SHA256 100k, salt hex.
- Verificar hash **offline** contra o D1 (`select password_hash, password_salt from users where email=?` + `hashlib.pbkdf2_hmac('sha256', senha, salt, 100000)`) diz na hora se é senha errada ou bug.
- **Cookie `sc_session` é HttpOnly** → `document.cookie` nunca mostra. "cookie ausente" no teste não é falha; confira `location.pathname` virando `/`.
- Teste de ciclo completo exige `Network.clearBrowserCookies` **antes** de cada etapa — sessão antiga fazia o signup nem rodar.
- **Erro de login agora fica no formulário** (`role=alert`), não só em toast: o toast some em segundos e no celular com teclado aberto o usuário perde o motivo. Botão de envio com `min-h-11` (44px).
- Migrations: `schema_migrations` é a tabela válida (10 arquivos aplicados); `d1_migrations` é legado com só 4. Números de arquivo duplicados (dois `0006_`, dois `0007_`) — ordem real é a de `applied_at`.
- Limpeza feita em 19/11: 11 contas de teste + 73 linhas em cascata + 7 objetos R2 órfãos. Sobrou `variantfeb@gmail.com` (2 artigos, 1 publicação, 129 mensagens).
