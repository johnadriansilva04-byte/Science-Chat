import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regressão do incidente de 2026-11-18: a coluna `users.orcid` existia no código
 * mas a migration `0008_users_orcid.sql` nunca foi aplicada em produção. O
 * `currentUser` passou a fazer `select u.orcid` e devolvia 500; como o erro era
 * engolido, o login parecia não funcionar (o app voltava para /auth em silêncio).
 *
 * Este teste monta o schema de `users` a partir das migrations e compara com as
 * colunas realmente consultadas em `auth.server.ts`.
 */
const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "migrations");

function allMigrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

function usersColumnsFromMigrations(): Set<string> {
  const sql = allMigrationSql();
  const cols = new Set<string>();
  const create = /create\s+table\s+(?:if\s+not\s+exists\s+)?users\s*\(([\s\S]*?)\);/i.exec(sql);
  const body = create?.[1];
  if (body) {
    for (const line of body.split("\n")) {
      const name = /^\s*([a-z_][a-z0-9_]*)\s+/i.exec(line)?.[1];
      if (name) cols.add(name.toLowerCase());
    }
  }
  for (const m of sql.matchAll(/alter\s+table\s+users\s+add\s+column\s+([a-z_][a-z0-9_]*)/gi)) {
    const name = m[1];
    if (name) cols.add(name.toLowerCase());
  }
  return cols;
}

/** Colunas de `users` citadas nas consultas de autenticação. */
function usersColumnsQueriedInCode(): Set<string> {
  const src = readFileSync(join(ROOT, "src/lib/cf/auth.server.ts"), "utf8");
  const cols = new Set<string>();
  for (const m of src.matchAll(/select\s+([\s\S]*?)\s+from\s+users/gi)) {
    for (const raw of (m[1] ?? "").split(",")) {
      const name = raw.trim().replace(/^u\./, "").split(/\s+/)[0];
      if (name && /^[a-z_][a-z0-9_]*$/i.test(name)) cols.add(name.toLowerCase());
    }
  }
  return cols;
}

describe("migrations cobrem as colunas de users usadas no código", () => {
  it("encontra as colunas esperadas nas migrations", () => {
    const cols = usersColumnsFromMigrations();
    for (const expected of ["id", "email", "password_hash", "password_salt", "display_name"]) {
      expect(cols, `migration de users sem a coluna ${expected}`).toContain(expected);
    }
  });

  it("toda coluna consultada em auth.server.ts existe no schema das migrations", () => {
    const schema = usersColumnsFromMigrations();
    const queried = usersColumnsQueriedInCode();
    expect(queried.size).toBeGreaterThan(0);
    const missing = [...queried].filter((c) => !schema.has(c));
    expect(missing, `colunas sem migration: ${missing.join(", ")}`).toEqual([]);
  });
});
