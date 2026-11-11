/**
 * Acesso aos bindings do Cloudflare Worker (D1, R2, KV, Workers AI).
 *
 * O nitro injeta `globalThis.__env__ = env` em toda requisição do Worker
 * (ver node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs).
 * Em desenvolvimento local sem wrangler usamos `process.env` como fallback.
 */

import { createD1Rest } from "@/lib/cf/d1-rest.server";

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: unknown,
  ): Promise<unknown>;
  get(key: string): Promise<unknown>;
  delete(key: string): Promise<void>;
  list(options?: unknown): Promise<unknown>;
}

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AiBinding {
  run(model: string, inputs: Record<string, unknown>, options?: unknown): Promise<unknown>;
}

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  KV: KVNamespace;
  AI: AiBinding;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  APP_ENV?: string;
  SESSION_SECRET?: string;
}

type GlobalWithEnv = typeof globalThis & { __env__?: Partial<Env> };

let restDb: D1Database | undefined;

/**
 * Fora do Cloudflare (ex.: Vercel) não existe binding `DB`. Quando as
 * credenciais estão no ambiente, criamos um D1 sobre a API REST uma única vez
 * e reaproveitamos a instância (o fetch é stateless, mas evita recriar).
 */
function restDbFromEnv(env: Record<string, unknown>): D1Database | undefined {
  const pick = (key: string) =>
    (env[key] as string | undefined) ?? (process.env[key] as string | undefined);
  const accountId = pick("CLOUDFLARE_ACCOUNT_ID");
  const databaseId = pick("D1_DATABASE_ID");
  const apiToken = pick("CLOUDFLARE_API_TOKEN");
  if (!accountId || !databaseId || !apiToken) return undefined;
  restDb ??= createD1Rest({ accountId, databaseId, apiToken });
  return restDb;
}

/** Retorna os bindings do Worker, com fallback para desenvolvimento local. */
export function getEnv(): Env {
  const g = globalThis as GlobalWithEnv;
  const env = (g.__env__ ?? {}) as Record<string, unknown>;
  const pick = (key: keyof Env) => env[key] ?? process.env[key as string];

  return {
    DB: pick("DB") ?? restDbFromEnv(env),
    FILES: pick("FILES"),
    KV: pick("KV"),
    AI: pick("AI"),
    ASSETS: env["ASSETS"] as Env["ASSETS"],
    APP_ENV: (env["APP_ENV"] as string | undefined) ?? process.env["APP_ENV"] ?? "development",
    SESSION_SECRET: (env["SESSION_SECRET"] as string | undefined) ?? process.env["SESSION_SECRET"],
  } as Env;
}

/** Igual a getEnv, mas falha com mensagem clara quando o binding não está configurado. */
export function requireDb(): D1Database {
  const { DB } = getEnv();
  if (!DB) {
    throw new Error(
      "Binding D1 'DB' não configurado. Rode `wrangler d1 create sciencechat` e preencha o database_id no wrangler.toml.",
    );
  }
  return DB;
}

/** Binding de IA (Workers AI), com erro claro quando ausente. */
export function requireAi(): AiBinding {
  const { AI } = getEnv();
  if (!AI) {
    throw new Error(
      "Binding 'AI' (Workers AI) não configurado. Ele é habilitado pela seção [ai] do wrangler.toml.",
    );
  }
  return AI;
}
