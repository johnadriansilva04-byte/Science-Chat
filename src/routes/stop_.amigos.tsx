import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Users } from "lucide-react";

import { AppHeader } from "@/components/app/AppHeader";
import { RoomBar } from "@/components/stop/RoomBar";

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

function FriendsPage() {
  return (
    <div className="stop-page">
      <div className="stop-page__sky" aria-hidden />
      <AppHeader />
      <div className="lab-rule" aria-hidden />

      <main className="run run--amigos">
        <Link to="/stop" className="run__back">
          <ChevronLeft size={14} aria-hidden />
          Stop
        </Link>

        <header className="run__intro">
          <span className="run__kicker">
            <Users size={13} aria-hidden />
            Stop com amigos
          </span>
          <h1 className="run__title">
            Sala <em>online</em>
          </h1>
          <p className="run__meta">Mesma letra, mesmo cronômetro. Dez rodadas, até doze pessoas.</p>
        </header>

        <RoomBar compact />

        <ul className="run__rules">
          <li>Quem cria escolhe as perguntas a dedo ou deixa o sorteio decidir.</li>
          <li>Resposta inédita vale 10 pontos; repetida com alguém vale 5.</li>
          <li>A rodada fecha quando todos mandam o STOP ou o tempo acaba.</li>
        </ul>
      </main>
    </div>
  );
}
