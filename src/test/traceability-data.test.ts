/**
 * Integração da matriz de rastreabilidade, auditorias e configuração editorial
 * sobre SQLite real (node:sqlite). Aplica TODAS as migrações (como o ledger faz)
 * e exercita as consultas reais do repositório através de um adaptador D1.
 */
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement } from "@/lib/cf/bindings.server";

function createD1(db: DatabaseSync): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      let bound: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          bound = values;
          return stmt;
        },
        async first<T>() {
          const row = db.prepare(query).get(...(bound as never[])) as T | undefined;
          return (row ?? null) as T | null;
        },
        async all<T>() {
          const results = db.prepare(query).all(...(bound as never[])) as T[];
          return { results, success: true, meta: {} };
        },
        async run() {
          db.prepare(query).run(...(bound as never[]));
          return { results: [], success: true, meta: {} };
        },
      };
      return stmt;
    },
    async batch<T>(statements: D1PreparedStatement[]) {
      const out = [];
      for (const s of statements) out.push(await s.all<T>());
      return out as never;
    },
    async exec(query: string) {
      db.exec(query);
      return { count: 0, duration: 0 };
    },
  };
}

function freshDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  const files = readdirSync("migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) db.exec(readFileSync(`migrations/${file}`, "utf8"));
  return db;
}

describe("rastreabilidade e auditoria (D1/SQLite real)", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = freshDb();
    (globalThis as unknown as { __env__: Record<string, unknown> }).__env__ = { DB: createD1(db) };
  });

  afterEach(() => {
    delete (globalThis as unknown as { __env__?: unknown }).__env__;
  });

  it("numera afirmações de forma estável e isola por dono", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const repo = await import("@/lib/cf/repo.server");
    const u1 = await auth.createUser("t1@b.com", "senha123");
    const u2 = await auth.createUser("t2@b.com", "senha123");
    const article = await repo.createArticle(u1.id);

    const c1 = await repo.addClaim(u1.id, article.id, {
      text: "primeira afirmação",
      category: "resultado",
      sourceQuestion: "q",
      sourceAnswer: "a",
      state: "aguardando_validacao",
    });
    const c2 = await repo.addClaim(u1.id, article.id, {
      text: "segunda afirmação",
      category: "hipotese",
      sourceQuestion: null,
      sourceAnswer: null,
      state: "declarada",
    });
    expect(c1.seq).toBe(1);
    expect(c2.seq).toBe(2);

    // Outro usuário não enxerga nem altera as afirmações.
    expect((await repo.listClaims(u2.id, article.id)).length).toBe(0);
    expect(await repo.getClaim(u2.id, article.id, c1.id)).toBeNull();
    await repo.updateClaim(u2.id, article.id, c1.id, { state: "sustentada" });
    expect((await repo.getClaim(u1.id, article.id, c1.id))?.state).toBe("aguardando_validacao");
  });

  it("vincula evidência a uma afirmação e conta a matriz", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const repo = await import("@/lib/cf/repo.server");
    const u = await auth.createUser("ev@b.com", "senha123");
    const article = await repo.createArticle(u.id);

    const claim = await repo.addClaim(u.id, article.id, {
      text: "o experimento aumentou 35%",
      category: "resultado",
      sourceQuestion: null,
      sourceAnswer: null,
      state: "aguardando_validacao",
    });
    const doc = await repo.addDocument(u.id, article.id, {
      filename: "resultado.csv",
      mime: "text/csv",
      size: 10,
      content: null,
      storageKey: "articles/x/documents/y",
      textContent: "o experimento aumentou 35 por cento no desempenho",
      note: null,
    });
    await repo.addEvidence(u.id, claim.id, {
      documentId: doc.id,
      location: "Anexo 1",
      excerpt: "aumentou 35 por cento",
      matchDegree: "direta",
      state: "sustentada",
      note: null,
    });
    await repo.updateClaim(u.id, article.id, claim.id, { state: "sustentada" });

    const evidence = await repo.listEvidence(u.id, article.id);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.document_id).toBe(doc.id);
    expect((await repo.getClaim(u.id, article.id, claim.id))?.state).toBe("sustentada");

    // Evidência de outro usuário não pode ser apagada pelo dono errado.
    const u2 = await auth.createUser("ev2@b.com", "senha123");
    await repo.deleteEvidence(u2.id, evidence[0]!.id);
    expect(await repo.listEvidence(u.id, article.id)).toHaveLength(1);
  });

  it("grava e lista auditorias em ordem decrescente", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const repo = await import("@/lib/cf/repo.server");
    const u = await auth.createUser("au@b.com", "senha123");
    const article = await repo.createArticle(u.id);

    await repo.addAudit(u.id, article.id, {
      scope: "article",
      scopeRef: null,
      report: "primeiro relatório",
      summary: "Sem achados",
    });
    await repo.addAudit(u.id, article.id, {
      scope: "page",
      scopeRef: "1",
      report: "segundo relatório",
      summary: "1 alta",
    });
    const audits = await repo.listAudits(u.id, article.id);
    expect(audits).toHaveLength(2);
    expect(audits[0]?.report).toBe("segundo relatório");
  });

  it("faz upsert da configuração editorial e marca a data de conferência", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const repo = await import("@/lib/cf/repo.server");
    const u = await auth.createUser("ed@b.com", "senha123");
    const article = await repo.createArticle(u.id);

    const first = await repo.upsertEditorialConfig(u.id, article.id, {
      destination: "udelar",
      unit: "Facultad de Ingeniería",
      standard: "udelar",
      language: "es",
      guidelines: null,
      notes: null,
    });
    expect(first.verified_at).toBeNull(); // sem diretrizes ainda

    const second = await repo.upsertEditorialConfig(u.id, article.id, {
      destination: "udelar",
      unit: "Facultad de Ingeniería",
      standard: "udelar",
      language: "es",
      guidelines: "Instruções oficiais da unidade...",
      notes: "submissão em março",
    });
    expect(second.verified_at).not.toBeNull();
    const loaded = await repo.getEditorialConfig(u.id, article.id);
    expect(loaded?.destination).toBe("udelar");
    expect(loaded?.guidelines).toContain("Instruções oficiais");
  });

  it("apaga afirmações, evidências e auditorias em cascata com o artigo", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const repo = await import("@/lib/cf/repo.server");
    const u = await auth.createUser("cc@b.com", "senha123");
    const article = await repo.createArticle(u.id);
    const claim = await repo.addClaim(u.id, article.id, {
      text: "afirmação",
      category: "dado",
      sourceQuestion: null,
      sourceAnswer: null,
      state: "aguardando_validacao",
    });
    await repo.addEvidence(u.id, claim.id, {
      documentId: null,
      location: null,
      excerpt: null,
      matchDegree: null,
      state: "nao_verificavel",
      note: null,
    });
    await repo.addAudit(u.id, article.id, {
      scope: "article",
      scopeRef: null,
      report: "r",
      summary: null,
    });
    await repo.upsertEditorialConfig(u.id, article.id, {
      destination: "independente",
      unit: null,
      standard: "abnt",
      language: "pt",
      guidelines: null,
      notes: null,
    });

    await repo.deleteArticle(u.id, article.id);

    for (const table of ["claims", "claim_evidence", "audits", "editorial_configs"]) {
      const row = db.prepare(`select count(*) as n from ${table}`).get() as { n: number };
      expect(row.n, table).toBe(0);
    }
  });
});
