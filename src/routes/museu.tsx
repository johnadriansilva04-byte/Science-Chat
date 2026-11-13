import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Landmark, ExternalLink, Quote } from "lucide-react";
import {
  MUSEUM_SIZE,
  MUSEUM_WINGS,
  MUSEUM_WORKS,
  museumDoiUrl,
  type MuseumWingId,
} from "@/lib/museum";
import { BrandFooter } from "@/components/app/BrandFooter";
import { cn } from "@/lib/utils";
import logo from "@/assets/sciencechat-logo.png";

export const Route = createFileRoute("/museu")({
  head: () => ({
    meta: [
      { title: "Museu de Artigos Científicos — ScienceChat" },
      {
        name: "description",
        content:
          "Acervo curado de artigos que mudaram o mundo: revolução científica, poder e violência institucional, psicologia e metacognição. Metadados reais, com DOI.",
      },
    ],
  }),
  component: MuseumPage,
});

function MuseumPage() {
  const [wing, setWing] = useState<MuseumWingId | "todas">("todas");
  const works = useMemo(
    () => (wing === "todas" ? MUSEUM_WORKS : MUSEUM_WORKS.filter((w) => w.wing === wing)),
    [wing],
  );

  return (
    <div className="lab-bg min-h-screen bg-background">
      <header className="flex items-center gap-2 p-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="" width={28} height={28} />
          <span className="font-serif text-lg font-semibold">ScienceChat</span>
        </Link>
        <nav className="ml-auto text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Início
          </Link>
        </nav>
      </header>
      <div className="lab-rule" aria-hidden />

      <main className="mx-auto max-w-4xl px-6 pb-16 pt-10">
        <div className="flex items-center gap-3">
          <Landmark className="size-7 text-primary" />
          <h1 className="font-serif text-3xl font-semibold md:text-4xl">
            Museu de Artigos Científicos
          </h1>
        </div>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Um acervo vivo das obras que <strong>revolucionaram a humanidade</strong> — de Einstein a
          Turing — e das pesquisas que revelam como o{" "}
          <strong>poder, a burocracia e a violência institucional</strong> excluem, junto com o que
          a <strong>psicologia e a metacognição</strong> descobriram sobre como pensamos e nos
          enganamos. Todos os metadados são <em>reais</em> e conferidos (Crossref/OpenAlex), com DOI
          para a fonte original. As notas são leitura própria da ScienceChat; o texto das obras é
          dos seus autores.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWing("todas")}
            className={cn("museum-chip", wing === "todas" && "museum-chip--active")}
          >
            Todas · {MUSEUM_SIZE}
          </button>
          {MUSEUM_WINGS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWing(w.id)}
              className={cn("museum-chip", wing === w.id && "museum-chip--active")}
            >
              {w.label}
            </button>
          ))}
        </div>

        {wing !== "todas" && (
          <p className="mt-3 text-sm italic text-muted-foreground">
            {MUSEUM_WINGS.find((w) => w.id === wing)?.subtitle}
          </p>
        )}

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {works.map((w) => (
            <li key={w.id} className="museum-card">
              <div className="flex items-start justify-between gap-3">
                <span className="museum-card__year tabular-nums">{w.year}</span>
                <span className="museum-card__wing">
                  {MUSEUM_WINGS.find((x) => x.id === w.wing)?.label}
                </span>
              </div>
              <h2 className="museum-card__title">{w.titlePt}</h2>
              <p className="museum-card__orig">{w.title}</p>
              <p className="museum-card__authors">{w.authors}</p>
              <p className="museum-card__venue">{w.venue}</p>
              <p className="museum-card__note">
                <Quote className="mr-1 inline size-3.5 text-primary" />
                {w.note}
              </p>
              <div className="museum-card__tags">
                {w.tags.map((t) => (
                  <span key={t} className="museum-tag">
                    {t}
                  </span>
                ))}
              </div>
              <a
                href={museumDoiUrl(w.doi)}
                target="_blank"
                rel="noreferrer"
                className="museum-card__doi"
              >
                DOI {w.doi}
                <ExternalLink className="size-3.5" />
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs text-muted-foreground">
          Museu alimentado por metadados verificados de Crossref e OpenAlex. Se você publicar o seu
          artigo pela ScienceChat e ele passar pela revisão por pares, ele também pode entrar no
          acervo — a sua autoria fica preservada e creditada.
        </p>
      </main>
      <BrandFooter />
    </div>
  );
}
