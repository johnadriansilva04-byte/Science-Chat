/**
 * Testes do limite de requisições. Exercita o caminho D1 (SQLite real) e o
 * caminho KV (mock em memória), sem mockar a lógica do limitador.
 */
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, KVNamespace } from "@/lib/cf/bindings.server";

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

/** KV em memória com o mesmo contrato usado pelo limitador. */
function createKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

function setEnv(env: Record<string, unknown>) {
  (globalThis as unknown as { __env__: Record<string, unknown> }).__env__ = env;
}

const POLICY = { limit: 3, windowSec: 60 };

describe("limite de requisições", () => {
  afterEach(() => {
    delete (globalThis as unknown as { __env__?: unknown }).__env__;
  });

  describe("fallback em D1", () => {
    beforeEach(() => {
      setEnv({ DB: createD1(new DatabaseSync(":memory:")) });
    });

    it("permite até o limite e bloqueia em seguida", async () => {
      const { consumeRateLimit } = await import("@/lib/cf/rate-limit.server");
      expect((await consumeRateLimit("k", POLICY)).ok).toBe(true);
      expect((await consumeRateLimit("k", POLICY)).ok).toBe(true);
      expect((await consumeRateLimit("k", POLICY)).ok).toBe(true);
      const blocked = await consumeRateLimit("k", POLICY);
      expect(blocked.ok).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    });

    it("isola chaves diferentes", async () => {
      const { consumeRateLimit } = await import("@/lib/cf/rate-limit.server");
      await consumeRateLimit("a", POLICY);
      await consumeRateLimit("a", POLICY);
      await consumeRateLimit("a", POLICY);
      expect((await consumeRateLimit("a", POLICY)).ok).toBe(false);
      expect((await consumeRateLimit("b", POLICY)).ok).toBe(true);
    });

    it("reduz o remaining a cada consumo", async () => {
      const { consumeRateLimit } = await import("@/lib/cf/rate-limit.server");
      expect((await consumeRateLimit("k", POLICY)).remaining).toBe(2);
      expect((await consumeRateLimit("k", POLICY)).remaining).toBe(1);
      expect((await consumeRateLimit("k", POLICY)).remaining).toBe(0);
    });
  });

  describe("caminho KV", () => {
    beforeEach(() => {
      setEnv({ KV: createKv() });
    });

    it("aplica o limite igual ao D1", async () => {
      const { consumeRateLimit } = await import("@/lib/cf/rate-limit.server");
      await consumeRateLimit("k", POLICY);
      await consumeRateLimit("k", POLICY);
      await consumeRateLimit("k", POLICY);
      expect((await consumeRateLimit("k", POLICY)).ok).toBe(false);
    });
  });

  it("falha aberto quando o armazenamento quebra", async () => {
    setEnv({
      KV: {
        get: () => Promise.reject(new Error("KV fora do ar")),
        put: () => Promise.reject(new Error("KV fora do ar")),
        delete: () => Promise.resolve(),
      },
    });
    const { consumeRateLimit } = await import("@/lib/cf/rate-limit.server");
    expect((await consumeRateLimit("k", POLICY)).ok).toBe(true);
  });

  it("extrai o IP do cabeçalho da Cloudflare", async () => {
    const { clientIp } = await import("@/lib/cf/rate-limit.server");
    expect(clientIp(new Request("https://x", { headers: { "cf-connecting-ip": "1.2.3.4" } }))).toBe(
      "1.2.3.4",
    );
    expect(
      clientIp(new Request("https://x", { headers: { "x-forwarded-for": "5.6.7.8, 9.9.9.9" } })),
    ).toBe("5.6.7.8");
  });
});
