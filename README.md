# ScienceChat

Plataforma de investigação, construção e produção científica independente, com
inteligência artificial, documentação probatória, geração modular, montagem
página por página e auditoria científica.

**A ciência não depende de vínculo institucional.** O ScienceChat existe para que
qualquer pessoa — pesquisador independente, autodidata, estudante, profissional
de qualquer área — possa transformar uma ideia em um artigo científico
organizado, fundamentado, documentado e auditável.

## Princípio operacional

Primeiro investigar. Depois documentar. Depois auditar. Depois apresentar o
plano. Depois gerar **página por página**. Depois montar e revisar o artigo
completo. O pesquisador nunca entrega a autoria à IA: ele a usa como ferramenta.

## Stack

- **TypeScript** + **React 19** + **TanStack Start** (SSR) + **Vite**
- **Cloudflare Workers** (runtime de produção, via `nitro` preset `cloudflare-module`)
- **Cloudflare D1** — banco relacional (SQLite distribuído)
- **Cloudflare R2** — arquivos enviados (dossiê documental)
- **Cloudflare KV** — estado efêmero (sessões, rate limit)
- **Cloudflare Workers AI** — inferência dos modelos
- **Tailwind CSS** — interface

> Este projeto **não** usa Lovable nem Supabase. Toda a persistência e a
> inferência de IA rodam na Cloudflare.

## Bindings do Worker

Definidos em `wrangler.toml`:

| Binding | Recurso | Uso |
| --- | --- | --- |
| `DB` | D1 Database | artigos, páginas, mensagens, usuários, sessões |
| `FILES` | R2 Bucket | documentos anexados pelo pesquisador |
| `KV` | KV Namespace | sessões e controle de requisições |
| `AI` | Workers AI | geração e análise |
| `ASSETS` | Assets | frontend estático |

## Desenvolvimento

Requer Node.js 20+.

```sh
npm install
npm run dev          # http://localhost:3000
```

O dev server usa a emulação do wrangler. Para usar os bindings (D1, R2, KV, AI)
localmente é preciso um `CLOUDFLARE_API_TOKEN` no ambiente — o binding de IA não
tem emulação puramente local e abre uma sessão remota.

```sh
export CLOUDFLARE_API_TOKEN=...     # para emulação remota dos bindings
npm run db:migrate:local            # aplica o schema no D1 local
```

## Testes e build

```sh
npm test             # vitest (unit + integração com SQLite real)
npm run build        # gera o Worker em .output/
npm run lint
```

## Provisionar e publicar na Cloudflare

O script abaixo cria D1, R2 e KV, preenche os IDs no `wrangler.toml`, aplica as
migrações, grava o segredo de sessão, builda e publica:

```sh
export CLOUDFLARE_API_TOKEN=...
export SESSION_SECRET="$(openssl rand -hex 32)"
npm run cf:setup
```

Ou manualmente:

```sh
npx wrangler d1 create sciencechat          # copie o database_id para wrangler.toml
npx wrangler r2 bucket create sciencechat-files
npx wrangler kv namespace create sciencechat_kv   # copie o id para wrangler.toml
npm run db:migrate:remote
npx wrangler secret put SESSION_SECRET
npm run deploy
```

## Estrutura

```text
sciencechat/
├── wrangler.toml            # bindings do Worker (D1, R2, KV, AI)
├── migrations/              # schema do D1
├── scripts/cf-setup.sh      # provisiona e publica na Cloudflare
└── src/
    ├── routes/              # páginas (TanStack Router) e /api/chat
    ├── components/app/      # InterviewChat, PlanPanel, PagePanel, DocumentPanel
    ├── lib/
    │   ├── cf/              # bindings, auth, repositório D1, middleware
    │   ├── ai/              # gateway (Workers AI) e prompts
    │   └── article*.ts      # server functions, exportação, marcadores
    └── test/                # testes
```

## Licença

Uso livre para pesquisa independente.
