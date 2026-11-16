import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { requireUser } from "@/lib/cf/auth-middleware";
import {
  LOGIN_POLICY,
  SIGNUP_POLICY,
  clientIp,
  consumeRateLimit,
} from "@/lib/cf/rate-limit.server";
import {
  createSession,
  createUser,
  clearSessionCookie,
  destroySession,
  getSessionUser,
  verifyLogin,
} from "@/lib/cf/auth.server";

export type PublicUser = { id: string; email: string; displayName: string | null };

export const currentUser = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  if (!request) return null;
  const user = await getSessionUser(request);
  if (!user) return null;
  return { id: user.id, email: user.email, displayName: user.display_name } satisfies PublicUser;
});

export const signUp = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string; displayName?: string }) => d)
  .handler(async ({ data }) => {
    if (!data.email?.includes("@")) throw new Error("Informe um e-mail válido.");
    if (!data.password || data.password.length < 6)
      throw new Error("A senha deve ter ao menos 6 caracteres.");
    const ip = clientIp(getRequest());
    if (!(await consumeRateLimit(`signup:${ip}`, SIGNUP_POLICY)).ok) {
      throw new Error("Muitas tentativas de cadastro. Tente novamente mais tarde.");
    }
    const user = await createUser(data.email, data.password, data.displayName);
    const { cookie } = await createSession(user.id);
    setResponseHeader("set-cookie", cookie);
    return { id: user.id, email: user.email, displayName: user.display_name } satisfies PublicUser;
  });

export const signIn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const ip = clientIp(getRequest());
    // Limite por IP e por e-mail: trava ataques de força bruta contra uma conta
    // e varreduras de senha a partir de um mesmo IP.
    const byIp = await consumeRateLimit(`login:ip:${ip}`, LOGIN_POLICY);
    const byEmail = await consumeRateLimit(
      `login:email:${data.email?.trim().toLowerCase() ?? "vazio"}`,
      LOGIN_POLICY,
    );
    if (!byIp.ok || !byEmail.ok) {
      throw new Error("Muitas tentativas de login. Tente novamente mais tarde.");
    }
    const user = await verifyLogin(data.email, data.password);
    if (!user) throw new Error("E-mail ou senha inválidos.");
    const { cookie } = await createSession(user.id);
    setResponseHeader("set-cookie", cookie);
    return { id: user.id, email: user.email, displayName: user.display_name } satisfies PublicUser;
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  if (request) await destroySession(request);
  setResponseHeader("set-cookie", clearSessionCookie());
  return { ok: true };
});

/** Usado apenas para o cabeçalho exibir o usuário; exige sessão. */
export const whoAmI = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    return {
      id: context.user.id,
      email: context.user.email,
      displayName: context.user.display_name,
    } satisfies PublicUser;
  });
