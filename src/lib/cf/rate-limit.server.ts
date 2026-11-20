/**
 * Limite de requisições (rate limit) por janela fixa alinhada.
 *
 * Usa o binding KV quando ele existe (estado efêmero, TTL nativo). Sem KV,
 * cai para uma tabela `rate_limits` no D1 — assim o limite continua valendo em
 * produção mesmo antes de o namespace KV ser criado.
 */
import { getEnv, requireDb, type D1Database, type KVNamespace } from "@/lib/cf/bindings.server";

export type RateLimitPolicy = { limit: number; windowSec: number };

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

/** 40 mensagens a cada 5 min por usuário no chat (a chamada mais cara). */
export const CHAT_POLICY: RateLimitPolicy = { limit: 40, windowSec: 300 };

/** 10 tentativas de login a cada 15 min por IP + e-mail. */
export const LOGIN_POLICY: RateLimitPolicy = { limit: 10, windowSec: 900 };

/** 20 cadastros a cada hora por IP. */
export const SIGNUP_POLICY: RateLimitPolicy = { limit: 20, windowSec: 3600 };

function windowStart(policy: RateLimitPolicy, now = Date.now()): number {
  return Math.floor(now / (policy.windowSec * 1000));
}

function retryAfter(policy: RateLimitPolicy, now = Date.now()): number {
  const boundary = (windowStart(policy, now) + 1) * policy.windowSec * 1000;
  return Math.max(1, Math.ceil((boundary - now) / 1000));
}

async function viaKv(
  kv: KVNamespace,
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const k = `rl:${key}:${windowStart(policy)}`;
  const current = Number((await kv.get(k)) ?? "0");
  if (current >= policy.limit) {
    return { ok: false, remaining: 0, retryAfterSec: retryAfter(policy) };
  }
  // O TTL garante que a chave desapareça ao fim da janela, sem coleta manual.
  await kv.put(k, String(current + 1), { expirationTtl: policy.windowSec * 2 });
  return { ok: true, remaining: policy.limit - current - 1, retryAfterSec: 0 };
}

// O `create table` roda uma vez por instância de banco (cada isolate / cada
// banco de teste), não a cada requisição.
const ensured = new WeakMap<D1Database, Promise<void>>();

function ensureTable(db: D1Database): Promise<void> {
  let pending = ensured.get(db);
  if (!pending) {
    pending = db
      .prepare(
        "create table if not exists rate_limits (key text primary key, count integer not null, window_id integer not null)",
      )
      .run()
      .then(() => undefined);
    ensured.set(db, pending);
  }
  return pending;
}

async function viaD1(key: string, policy: RateLimitPolicy): Promise<RateLimitResult> {
  const db = requireDb();
  await ensureTable(db);
  const id = windowStart(policy);
  const row = await db
    .prepare("select count, window_id from rate_limits where key = ?")
    .bind(key)
    .first<{ count: number; window_id: number }>();

  if (!row || row.window_id !== id) {
    await db
      .prepare(
        "insert into rate_limits (key, count, window_id) values (?, 1, ?) on conflict(key) do update set count = 1, window_id = excluded.window_id",
      )
      .bind(key, id)
      .run();
    return { ok: true, remaining: policy.limit - 1, retryAfterSec: 0 };
  }

  if (row.count >= policy.limit) {
    return { ok: false, remaining: 0, retryAfterSec: retryAfter(policy) };
  }

  await db.prepare("update rate_limits set count = count + 1 where key = ?").bind(key).run();
  return { ok: true, remaining: policy.limit - row.count - 1, retryAfterSec: 0 };
}

/**
 * Consome uma unidade do limite `key`. Falha ABERTO: se o armazenamento estiver
 * indisponível, a requisição passa (o limite é proteção de custo, não de acesso).
 */
export async function consumeRateLimit(
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  try {
    const kv = getEnv().KV;
    if (kv) return await viaKv(kv, key, policy);
    return await viaD1(key, policy);
  } catch {
    return { ok: true, remaining: policy.limit, retryAfterSec: 0 };
  }
}

/** IP do cliente atrás da Cloudflare, com fallback para o proxy. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconhecido"
  );
}

/**
 * Resposta 429 padrão com o cabeçalho Retry-After.
 *
 * Sem `content-type` a resposta é um corpo opaco: o transporte do chat não
 * consegue ler a mensagem e o aviso amigável se perde (o cliente só via "Não
 * foi possível enviar"). JSON explícito mantém o texto legível para qualquer
 * consumidor.
 */
export function tooManyRequests(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Muitas requisições. Tente novamente em instantes.",
      retryAfterSec: result.retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "Retry-After": String(result.retryAfterSec),
      },
    },
  );
}
