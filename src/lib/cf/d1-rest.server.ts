/**
 * Adaptador D1 sobre a API REST da Cloudflare.
 *
 * O Vercel não oferece bindings de Worker, então quando `env.DB` está ausente
 * (e as credenciais da Cloudflare estão no ambiente) falamos com o D1 pelo
 * endpoint HTTP, mantendo a mesma interface usada em `repo.server.ts`.
 */
import type { D1Database, D1PreparedStatement, D1Result } from "@/lib/cf/bindings.server";

export type D1RestCredentials = {
  accountId: string;
  databaseId: string;
  apiToken: string;
};

type RestQueryResponse = {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result?: Array<{
    results?: unknown[];
    success?: boolean;
    meta?: Record<string, unknown>;
  }>;
};

function endpoint({ accountId, databaseId }: D1RestCredentials): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
}

async function execute(
  creds: D1RestCredentials,
  sql: string,
  params: unknown[],
): Promise<D1Result> {
  const response = await fetch(endpoint(creds), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = (await response.json()) as RestQueryResponse;
  if (!data.success) {
    const detail =
      data.errors
        ?.map((e) => e.message)
        .filter(Boolean)
        .join("; ") || `HTTP ${response.status}`;
    throw new Error(`D1 REST: ${detail}`);
  }
  const first = data.result?.[0];
  return {
    results: (first?.results ?? []) as never[],
    success: first?.success ?? true,
    meta: first?.meta ?? {},
  };
}

class RestStatement implements D1PreparedStatement {
  constructor(
    private readonly creds: D1RestCredentials,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new RestStatement(this.creds, this.sql, values);
  }

  async first<T = unknown>(_colName?: string): Promise<T | null> {
    const { results } = await execute(this.creds, this.sql, this.params);
    return (results[0] as T) ?? null;
  }

  run(): Promise<D1Result> {
    return execute(this.creds, this.sql, this.params);
  }

  all<T = unknown>(): Promise<D1Result<T>> {
    return execute(this.creds, this.sql, this.params) as Promise<D1Result<T>>;
  }
}

export function createD1Rest(creds: D1RestCredentials): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      return new RestStatement(creds, query);
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const out: D1Result<T>[] = [];
      for (const statement of statements) out.push(await statement.all<T>());
      return out;
    },
    async exec(query: string): Promise<{ count: number; duration: number }> {
      const result = await execute(creds, query, []);
      const duration = Number((result.meta as { duration?: number }).duration ?? 0);
      return { count: result.results.length, duration };
    },
  };
}
