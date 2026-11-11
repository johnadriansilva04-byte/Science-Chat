import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSessionUser, type User } from "@/lib/cf/auth.server";

/**
 * Middleware das server functions: exige sessão válida (cookie) e injeta o
 * usuário no contexto.
 */
export const requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  if (!request) throw new Error("Não autorizado: requisição indisponível");
  const user: User | null = await getSessionUser(request);
  if (!user) throw new Error("Não autorizado: faça login para continuar");
  return next({ context: { user } });
});
