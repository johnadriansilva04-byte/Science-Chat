import { useEffect, useState } from "react";
import { currentUser, type PublicUser } from "@/lib/auth.functions";

export type AuthState = {
  user: PublicUser | null;
  loading: boolean;
  /** Falha ao ler a sessão (ex.: banco indisponível). Não confundir com "sem sessão". */
  error: string | null;
};

/** Lê o usuário da sessão (cookie) via server function. */
export function useAuth(): AuthState {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    currentUser()
      .then((u) => {
        if (!active) return;
        setUser(u);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setUser(null);
        setError(err instanceof Error ? err.message : "Falha ao verificar a sessão.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { user, loading, error };
}
