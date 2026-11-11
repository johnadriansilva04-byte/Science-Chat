/**
 * Testes de integração da camada de dados e autenticação sobre um SQLite real
 * (node:sqlite). Não há mock da lógica: a migração é aplicada e as consultas
 * reais do repositório são exercitadas através de um adaptador D1 mínimo.
 */
import { readFileSync } from "node:fs";
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
  db.exec(readFileSync("migrations/0001_init.sql", "utf8"));
  return db;
}

describe("camada de dados (D1/SQLite real)", () => {
  let db: DatabaseSync;

  beforeEach(async () => {
    db = freshDb();
    (globalThis as unknown as { __env__: Record<string, unknown> }).__env__ = { DB: createD1(db) };
  });

  afterEach(() => {
    delete (globalThis as unknown as { __env__?: unknown }).__env__;
  });

  it("cria usuário, autentica e recusa senha errada", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const user = await auth.createUser("AUTODIDATA@Example.com ", "segredo123", "Autodidata");
    expect(user.email).toBe("autodidata@example.com");

    const ok = await auth.verifyLogin("autodidata@example.com", "segredo123");
    expect(ok?.id).toBe(user.id);

    const bad = await auth.verifyLogin("autodidata@example.com", "errada");
    expect(bad).toBeNull();
  });

  it("não permite dois usuários com o mesmo e-mail", async () => {
    const auth = await import("@/lib/cf/auth.server");
    await auth.createUser("a@b.com", "senha123");
    await expect(auth.createUser("a@b.com", "outra123")).rejects.toThrow();
  });

  it("valida a sessão pelo cookie e recusa após expirar", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const user = await auth.createUser("s@b.com", "senha123");
    const { token } = await auth.createSession(user.id);

    const req = new Request("https://x/", { headers: { cookie: `sc_session=${token}` } });
    const current = await auth.getSessionUser(req);
    expect(current?.id).toBe(user.id);

    // expira manualmente a sessão
    db.prepare("update sessions set expires_at = ? where id = ?").run("2000-01-01T00:00:00.000Z", token);
    const expired = await auth.getSessionUser(req);
    expect(expired).toBeNull();
  });

  it("isola os artigos por dono (posse verificada no código)", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const repo = await import("@/lib/cf/repo.server");
    const u1 = await auth.createUser("u1@b.com", "senha123");
    const u2 = await auth.createUser("u2@b.com", "senha123");

    const article = await repo.createArticle(u1.id);
    expect(await repo.getArticle(u2.id, article.id)).toBeNull();
    expect((await repo.listArticles(u2.id)).length).toBe(0);
    expect((await repo.listArticles(u1.id)).length).toBe(1);

    await repo.updateArticle(u2.id, article.id, { title: "invadido" });
    const after = await repo.getArticle(u1.id, article.id);
    expect(after?.title).toBe("Novo artigo");
  });

  it("grava páginas com upsert e controla o status", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const repo = await import("@/lib/cf/repo.server");
    const u = await auth.createUser("p@b.com", "senha123");
    const article = await repo.createArticle(u.id);

    await repo.upsertPage(u.id, article.id, 1, "primeira versão", "draft");
    await repo.upsertPage(u.id, article.id, 1, "segunda versão", "draft");
    await repo.setPageStatus(u.id, article.id, 1, "approved");

    const pages = await repo.listPages(u.id, article.id);
    expect(pages.length).toBe(1);
    expect(pages[0]?.content).toBe("segunda versão");
    expect(pages[0]?.status).toBe("approved");

    await repo.deletePage(u.id, article.id, 1);
    expect((await repo.listPages(u.id, article.id)).length).toBe(0);
  });

  it("salva e lê mensagens da entrevista em ordem", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const repo = await import("@/lib/cf/repo.server");
    const u = await auth.createUser("m@b.com", "senha123");
    const article = await repo.createArticle(u.id);

    await repo.addMessage(u.id, article.id, "user", [{ type: "text", text: "Olá" }]);
    await repo.addMessage(u.id, article.id, "assistant", [{ type: "text", text: "Vamos começar" }]);

    const msgs = await repo.listMessages(u.id, article.id);
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(JSON.parse(msgs[0]?.parts ?? "[]")).toEqual([{ type: "text", text: "Olá" }]);
  });

  it("apaga em cascata páginas e mensagens ao excluir o artigo", async () => {
    const auth = await import("@/lib/cf/auth.server");
    const repo = await import("@/lib/cf/repo.server");
    const u = await auth.createUser("c@b.com", "senha123");
    const article = await repo.createArticle(u.id);
    await repo.upsertPage(u.id, article.id, 1, "conteúdo");
    await repo.addMessage(u.id, article.id, "user", [{ type: "text", text: "x" }]);

    await repo.deleteArticle(u.id, article.id);

    const pages = db.prepare("select count(*) as n from article_pages where article_id = ?").get(article.id) as {
      n: number;
    };
    const msgs = db.prepare("select count(*) as n from chat_messages where article_id = ?").get(article.id) as {
      n: number;
    };
    expect(pages.n).toBe(0);
    expect(msgs.n).toBe(0);
  });
});
