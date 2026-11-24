import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, KeyRound, LogIn, Plus, Timer, Trophy, Users } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { createStopRoom } from "@/lib/stop-room.functions";
import { normalizeRoomCode, roomCodeValid } from "@/lib/stop-room";

export const Route = createFileRoute("/stop_/amigos")({
  head: () => ({
    meta: [
      { title: "Stop com amigos — sala online · ScienceChat" },
      {
        name: "description",
        content:
          "Abra uma sala, mande o código e jogue Stop com até doze pessoas: mesma letra, mesmo cronômetro, dez rodadas.",
      },
    ],
  }),
  component: FriendsPage,
});

const HOUSE_RULES = [
  { icon: Timer, title: "Mesmo relógio", text: "45s a 150s, igual para todo mundo." },
  { icon: Trophy, title: "10 e 5 pontos", text: "Inédita vale 10; repetida vale 5." },
  { icon: Users, title: "Até 12 pessoas", text: "Quem entra depois assiste até a próxima." },
];

function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    <div className="stop-page">
      <div className="stop-page__sky" aria-hidden />
      <AppHeader />
      <div className="lab-rule" aria-hidden />

      <main className="lobby">
        <Link to="/stop" className="run__back">
          <ChevronLeft size={14} aria-hidden />
          Stop
        </Link>

        <header className="lobby__head">
          <span className="run__kicker">
            <Users size={13} aria-hidden />
            Stop com amigos
          </span>
          <h1 className="run__title">
            Sala <em>online</em>
          </h1>
          <p className="run__meta">Mesma letra, mesmo cronômetro. Dez rodadas, até doze pessoas.</p>
        </header>

        <div className="lobby__doors">
          <button
            type="button"
            onClick={() => void openRoom()}
            disabled={busy}
            className="lobby-card is-host"
          >
            <span className="lobby-card__icon">
              <Plus size={20} aria-hidden />
            </span>
            <span className="lobby-card__kicker">Anfitrião</span>
            <strong className="lobby-card__title">{busy ? "Abrindo…" : "Criar sala"}</strong>
            <span className="lobby-card__text">
              Você escolhe as perguntas a dedo ou deixa o sorteio decidir.
            </span>
            <span className="lobby-card__cta">Abrir e convidar</span>
          </button>

          <form onSubmit={enterRoom} className="lobby-card is-join">
            <span className="lobby-card__icon">
              <KeyRound size={20} aria-hidden />
            </span>
            <span className="lobby-card__kicker">Convidado</span>
            <strong className="lobby-card__title">Entrar com código</strong>
            <span className="lobby-card__text">Seis caracteres que o anfitrião mandou.</span>
            <div className="lobby-card__join">
              <input
                value={code}
                onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
                placeholder="ABC123"
                aria-label="Código da sala"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={6}
              />
              <button type="submit" disabled={!roomCodeValid(code)}>
                Entrar
              </button>
            </div>
          </form>
        </div>

        {!user ? (
          <Link to="/auth" className="lobby__signin">
            <LogIn size={13} aria-hidden />
            Entrar na conta para criar ou jogar uma sala
          </Link>
        ) : null}

        <ul className="lobby__rules">
          {HOUSE_RULES.map((rule) => (
            <li key={rule.title}>
              <rule.icon size={14} aria-hidden />
              <strong>{rule.title}</strong>
              <span>{rule.text}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
