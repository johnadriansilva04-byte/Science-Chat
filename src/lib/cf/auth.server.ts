/**
 * Autenticação própria do ScienceChat sobre D1 + cookies.
 * Sem dependências externas: hash de senha com PBKDF2 (Web Crypto)
 * e sessão com token aleatório persistido no D1.
 */
import { requireDb } from "@/lib/cf/bindings.server";

const SESSION_COOKIE = "sc_session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000;

export type User = { id: string; email: string; display_name: string | null };

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

export function newId(): string {
  return crypto.randomUUID();
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? []);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createUser(
  email: string,
  password: string,
  displayName?: string,
): Promise<User> {
  const db = requireDb();
  const normalized = email.trim().toLowerCase();
  const existing = await db
    .prepare("select id from users where email = ?")
    .bind(normalized)
    .first<{ id: string }>();
  if (existing) throw new Error("Já existe uma conta com este e-mail.");

  const id = newId();
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  await db
    .prepare(
      "insert into users (id, email, password_hash, password_salt, display_name) values (?, ?, ?, ?, ?)",
    )
    .bind(id, normalized, hash, salt, displayName?.trim() || null)
    .run();
  return { id, email: normalized, display_name: displayName?.trim() || null };
}

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  const db = requireDb();
  const normalized = email.trim().toLowerCase();
  const row = await db
    .prepare(
      "select id, email, display_name, password_hash, password_salt from users where email = ?",
    )
    .bind(normalized)
    .first<{
      id: string;
      email: string;
      display_name: string | null;
      password_hash: string;
      password_salt: string;
    }>();
  if (!row) return null;
  const hash = await hashPassword(password, row.password_salt);
  if (!timingSafeEqual(hash, row.password_hash)) return null;
  return { id: row.id, email: row.email, display_name: row.display_name };
}

export async function createSession(userId: string): Promise<{ token: string; cookie: string }> {
  const db = requireDb();
  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare("insert into sessions (id, user_id, expires_at) values (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();
  const cookie = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
    "Secure",
  ].join("; ");
  return { token, cookie };
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export async function getSessionUser(request: Request): Promise<User | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const db = requireDb();
  const row = await db
    .prepare(
      `select u.id, u.email, u.display_name, s.expires_at
       from sessions s join users u on u.id = s.user_id
       where s.id = ?`,
    )
    .bind(token)
    .first<{ id: string; email: string; display_name: string | null; expires_at: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.prepare("delete from sessions where id = ?").bind(token).run();
    return null;
  }
  return { id: row.id, email: row.email, display_name: row.display_name };
}

export async function destroySession(request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await requireDb().prepare("delete from sessions where id = ?").bind(token).run();
}
