#!/usr/bin/env bash
# Provisiona os recursos Cloudflare do ScienceChat e preenche os IDs no wrangler.toml.
# Requer CLOUDFLARE_API_TOKEN (e opcionalmente CLOUDFLARE_ACCOUNT_ID) no ambiente.
set -euo pipefail

DB_NAME="sciencechat"
R2_NAME="sciencechat-files"
KV_NAME="sciencechat_kv"

echo "==> Criando D1 (${DB_NAME})"
D1_OUT=$(npx wrangler d1 create "${DB_NAME}" 2>&1 || true)
echo "${D1_OUT}"
D1_ID=$(printf '%s' "${D1_OUT}" | grep -oE '"database_id"[^"]*"[a-f0-9-]{36}"' | grep -oE '[a-f0-9-]{36}' | head -1 || true)

echo "==> Criando bucket R2 (${R2_NAME})"
npx wrangler r2 bucket create "${R2_NAME}" 2>&1 || true

echo "==> Criando namespace KV (${KV_NAME})"
KV_OUT=$(npx wrangler kv namespace create "${KV_NAME}" 2>&1 || true)
echo "${KV_OUT}"
KV_ID=$(printf '%s' "${KV_OUT}" | grep -oE '"id"[^"]*"[a-f0-9]{32}"' | grep -oE '[a-f0-9]{32}' | head -1 || true)

if [ -n "${D1_ID}" ]; then
  sed -i "s/database_id = \".*\"/database_id = \"${D1_ID}\"/" wrangler.toml
  echo "==> wrangler.toml: database_id = ${D1_ID}"
fi
if [ -n "${KV_ID}" ]; then
  sed -i "s/^id = \".*\"/id = \"${KV_ID}\"/" wrangler.toml
  echo "==> wrangler.toml: KV id = ${KV_ID}"
fi

echo "==> Aplicando migrações no D1 remoto"
npx wrangler d1 execute "${DB_NAME}" --remote --file=migrations/0001_init.sql

echo "==> Definindo o segredo de sessão (SESSION_SECRET)"
if [ -n "${SESSION_SECRET:-}" ]; then
  printf '%s' "${SESSION_SECRET}" | npx wrangler secret put SESSION_SECRET
else
  echo "   (defina SESSION_SECRET no ambiente para gravar o segredo automaticamente)"
fi

echo "==> Build + deploy"
npm run build
npx wrangler deploy

echo "==> Concluído."
