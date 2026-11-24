import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Users } from "lucide-react";

import { AppHeader } from "@/components/app/AppHeader";

export const Route = createFileRoute("/stop")({
  head: () => ({
    meta: [
      { title: "Stop — campanha de férias e sala com amigos · ScienceChat" },
      {
        name: "description",
        content:
          "Duas formas de jogar Stop: a expedição solo em cinco campanhas ou a sala online com até doze pessoas na mesma letra e no mesmo cronômetro.",
      },
      { property: "og:title", content: "Stop — campanha de férias e sala com amigos" },
    ],
  }),
  component: StopCover,
});

function StopCover() {
  return (
    <div className="stop-page cover">
      <div className="stop-page__sky" aria-hidden />
      <AppHeader />
      <div className="lab-rule" aria-hidden />

      <main className="cover__body">
        <header className="cover__head">
          <span className="cover__kicker">
            <Flame size={13} aria-hidden />
            Stop
          </span>
          <h1 className="cover__title">
            Como você quer <em>jogar</em>?
          </h1>
          <p className="cover__lead">Duas portas. Escolha uma.</p>
        </header>

        <div className="cover__doors">
          <Link to="/stop/campanha" className="cover-door is-campanha">
            <span className="cover-door__icon">
              <Flame size={26} aria-hidden />
            </span>
            <span className="cover-door__kicker">Campanha de férias</span>
            <strong className="cover-door__title">Expedição Stop</strong>
            <span className="cover-door__meta">15 fases · estrelas e XP · solo</span>
            <span className="cover-door__cta">Entrar</span>
          </Link>

          <Link to="/stop/amigos" className="cover-door is-amigos">
            <span className="cover-door__icon">
              <Users size={26} aria-hidden />
            </span>
            <span className="cover-door__kicker">Stop com amigos</span>
            <strong className="cover-door__title">Sala online</strong>
            <span className="cover-door__meta">Até 12 pessoas · mesma letra e tempo</span>
            <span className="cover-door__cta">Entrar</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
