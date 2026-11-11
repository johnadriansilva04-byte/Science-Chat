# ScienceChat — memória do projeto

App TanStack Start (React 19) + Supabase (auth + Postgres via RLS), gerado pelo Lovable. IA via gateway Lovable (`LOVABLE_API_KEY`, `src/lib/ai/gateway.server.ts`, modelo `openai/gpt-6-astra`).

## Convenções do repositório
- Rotas em `src/routes/` (file-based TanStack). `routeTree.gen.ts` é gerado — nunca editar à mão; ele é regenerado pelo `npm run build` (plugin do vite) e por `npm run dev`.
- Server functions em `src/lib/*.functions.ts` com `createServerFn` + middleware `requireSupabaseAuth`; o cliente Supabase vem em `context.supabase` (RLS aplica).
- Tipos do banco em `src/integrations/supabase/types.ts` (gerado). Ao adicionar colunas/tabelas, atualizar esse arquivo.
- Migrações em `drizzle/` e `supabase/migrations/` são GERIDAS pelo Lovable — não editar à mão (ver AGENTS.md). Mudança de schema precisa passar pelo Lovable.
- Sem `bun` no ambiente: usar `npm`. `node_modules` não vem versionado.

## Fluxo do produto (regra central)
Primeiro investigar (entrevista) → depois montar/aprovar plano → depois gerar PÁGINA POR PÁGINA com aprovação humana → montar documento mestre. Nunca gerar o artigo inteiro de uma vez; a montagem não reescreve o conteúdo aprovado.

## Armadilhas conhecidas
- `tsconfig` tem `noImplicitReturns` e `exactOptionalPropertyTypes`. Evitar `return toast.error(...)` (retorna valor) e usar `if (...) { ...; return; }`. Evitar passar `undefined` explícito em props opcionais.
- Erros de tsc pré-existentes (não introduzidos por nós) em: `ai-elements/message.tsx` e `shimmer.tsx`, `ai/gateway.server.ts`, `supabase-user.server.ts`, `ArticlesMenu.tsx`. `npm run build` mesmo assim passa.
- O terminal às vezes ecoa o comando com caracteres-lixo no início de algumas linhas; é artefato de display — verificar o arquivo real antes de assumir corrupção.

## Estado
Já funciona: login, lista de artigos, área do artigo `/a/$articleId` (Entrevista/Plano/Produção/Documento), plano + aprovação, geração página por página com continuidade, documento mestre e exportação MD/TXT/PDF. Falta: dossiê documental, matriz de rastreabilidade, auditoria, config editorial Udelar, exportação DOCX/LaTeX.
