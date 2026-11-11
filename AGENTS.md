# AGENTS.md — ScienceChat

Plataforma de produção científica independente (TypeScript + Cloudflare).
Interface em português (pt-BR).

## Stack e convenções

- **Runtime:** Cloudflare Workers (build via `nitro` preset `cloudflare-module`,
  saída em `.output/`). Deploy: `npm run deploy`.
- **Banco:** Cloudflare **D1** (SQLite). Schema em `migrations/`. Nunca reintroduzir
  Supabase/Postgres/drizzle.
- **Arquivos:** Cloudflare **R2** (`FILES`). **KV** para estado efêmero.
- **IA:** Cloudflare **Workers AI** (`AI`), via `src/lib/ai/gateway.server.ts`.
  Nunca usar o gateway do Lovable nem chaves de IA no navegador.
- **Frontend:** React 19 + TanStack Start/Router + Tailwind. Texto da UI em pt-BR.

## Regras que não podem ser quebradas

- Nunca usar Lovable nem Supabase. Toda persistência e IA ficam na Cloudflare.
- Não editar arquivos com cabeçalho "automatically generated".
- Não commitar segredos. `SESSION_SECRET` e `CLOUDFLARE_API_TOKEN` vêm do ambiente
  (`wrangler secret` em produção).
- Não definir `ssr.external`/`resolve.external` no Vite: o Worker não resolve
  módulos em runtime e o build quebra.
- Não adicionar compressão (gzip/brotli): a borda da Cloudflare já comprime.

## Fluxo do produto (não misturar as etapas)

1. **Investigação:** entrevista adaptativa (perguntas essenciais, complementares e
   condicionais). Não exigir instituição, diploma, orientador ou laboratório.
   Permitir pular.
2. **Documentação:** dossiê documental (R2) e matriz de rastreabilidade.
3. **Auditoria:** verificação independente entre respostas, afirmações e documentos.
4. **Plano:** recapitulação + estrutura proposta, com aprovação do pesquisador.
5. **Produção:** geração **página por página**, uma unidade por requisição, com
   aprovação antes de avançar.
6. **Montagem:** documento mestre a partir das páginas aprovadas, sem reescrevê-las.

## Comandos

```sh
npm run dev              # http://localhost:3000 (emulação wrangler)
npm test                 # vitest
npm run build            # Worker em .output/
npm run deploy           # build + wrangler deploy
npm run cf:setup         # provisiona D1/R2/KV e publica
npm run db:migrate:local # aplica schema no D1 local
```
