#!/usr/bin/env node
/**
 * Aplica as migrações de `migrations/` no D1, em ordem, registrando cada uma
 * numa tabela `schema_migrations`. Diferente de reexecutar todos os arquivos, o
 * ledger garante que migrações destrutivas (que reconstroem tabelas) rodem uma
 * única vez e que o estado do banco seja reprodutível.
 *
 * Uso:
 *   node scripts/db-migrate.mjs --remote
 *   node scripts/db-migrate.mjs --local
 */
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const local = args.includes("--local");
if (!remote && !local) {
  console.error("Informe --remote ou --local.");
  process.exit(1);
}
const target = remote ? "--remote" : "--local";
const DB = process.env["D1_DATABASE"] ?? "sciencechat";

function d1(sql) {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB, target, "--json", "--command", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  const start = out.indexOf("[");
  const parsed = JSON.parse(out.slice(start));
  return parsed[0]?.results ?? [];
}

function applyFile(file) {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB, target, `--file=${join("migrations", file)}`],
    { stdio: "inherit" },
  );
}

d1(
  "create table if not exists schema_migrations (name text primary key, applied_at text not null default (datetime('now')))",
);
const applied = new Set(d1("select name from schema_migrations").map((r) => r.name));

const files = readdirSync("migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();

let ran = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`= já aplicada: ${file}`);
    continue;
  }
  console.log(`+ aplicando: ${file}`);
  applyFile(file);
  const safe = file.replace(/'/g, "''");
  d1(`insert into schema_migrations (name) values ('${safe}')`);
  ran += 1;
}
console.log(ran === 0 ? "Nada a fazer: banco atualizado." : `${ran} migração(ões) aplicada(s).`);
