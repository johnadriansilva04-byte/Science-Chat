import { useState } from "react";
import { LogIn, Plus, Users } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { createStopRoom } from "@/lib/stop-room.functions";
import { normalizeRoomCode, roomCodeValid } from "@/lib/stop-room";

/** Entrada do jogo em grupo: abrir sala ou entrar pelo código de 6 caracteres. */
export function RoomBar() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const openRoom = async () => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const room = await createStopRoom();
      void navigate({ to: "/stop/sala/$code", params: { code: room.code } });
    } catch {
      toast.error("Não foi possível abrir a sala agora.");
    } finally {
      setBusy(false);
    }
  };

  const enterRoom = (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomCodeValid(code)) {
      toast.error("O código tem 6 caracteres.");
      return;
    }
    void navigate({ to: "/stop/sala/$code", params: { code: normalizeRoomCode(code) } });
  };

  return (
    <section className="stop-rooms" aria-labelledby="stop-rooms-title">
      <div className="stop-rooms__text">
        <span className="stop-rooms__kicker">
          <Users className="size-3.5" aria-hidden />
          Stop com amigos
        </span>
        <h2 id="stop-rooms-title" className="stop-rooms__title">
          Abra uma sala e jogue junto
        </h2>
        <p className="stop-rooms__lead">
          Quem cria escolhe as perguntas a dedo — ou deixa o sorteio decidir. Todo mundo recebe a
          mesma letra, no mesmo cronômetro.
        </p>
      </div>

      <div className="stop-rooms__actions">
        <button
          type="button"
          onClick={() => void openRoom()}
          disabled={busy}
          className="stop-rooms__create"
        >
          <Plus className="size-4" aria-hidden />
          {busy ? "Abrindo…" : "Criar sala"}
        </button>

        {!loading && !user ? (
          <Link to="/auth" className="stop-rooms__enter">
            <LogIn className="size-3.5" aria-hidden />
            Entrar para jogar em grupo
          </Link>
        ) : (
          <form onSubmit={enterRoom} className="stop-rooms__join">
            <input
              value={code}
              onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
              placeholder="Código da sala"
              aria-label="Código da sala"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={6}
            />
            <button type="submit" disabled={!roomCodeValid(code)}>
              Entrar
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
