import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, BookOpenText, FileText, Globe } from "lucide-react";
import { listPublicPublications, type PublicationSummary } from "@/lib/publication.functions";
import { yearOf } from "@/lib/publication";
import { BrandFooter } from "@/components/app/BrandFooter";
import logo from "@/assets/sciencechat-logo.png";

export const Route = createFileRoute("/publicacoes/")({
  head: () => ({
    meta: [
      { title: "Publicações — ScienceChat" },
      {
        name: "description",
        content:
          "Área pública de artigos científicos revisados por pares e publicados na ScienceChat.",
      },
      { property: "og:title", content: "Publicações — ScienceChat" },
      {
        property: "og:description",
        content: "Artigos científicos revisados por pares e publicados na ScienceChat.",
      },
    ],
  }),
  component: PublicationsPage,
});

function PublicationsPage() {
  const [items, setItems] = useState<PublicationSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    listPublicPublications()
      .then((rows) => active && setItems(rows))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-2 border-b px-4 py-3">
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

      <main className="mx-auto max-w-3xl px-6 pb-16 pt-10">
        <div className="flex items-center gap-3">
          <BookOpenText className="size-6 text-primary" />
          <h1 className="font-serif text-3xl font-semibold">Publicações</h1>
        </div>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Artigos científicos <strong>revisados por pares</strong> e publicados por seus autores
          nesta plataforma. A revisão avalia problema, método, evidências e fundamentação — nunca a
          filiação institucional do autor. Aqui só entra o trabalho que passou pela revisão e
          recebeu o parecer favorável.
        </p>

        {items === null && (
          <p className="mt-10 text-sm text-muted-foreground">Carregando publicações…</p>
        )}

        {items?.length === 0 && (
          <div className="mt-10 rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            Ainda não há artigos publicados. Assim que um artigo passar pela revisão por pares e o
            autor publicar, ele aparecerá aqui.
          </div>
        )}

        <ul className="mt-8 space-y-4">
          {items?.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <Link to="/publicacoes/$slug" params={{ slug: p.slug }} className="block">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif text-xl font-semibold leading-snug">{p.title}</h2>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    <BadgeCheck className="size-3.5" />
                    Revisado por pares
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.author_name}</p>
                {p.abstract && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.abstract}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {p.area && (
                    <span className="inline-flex items-center gap-1">
                      <FileText className="size-3.5" />
                      {p.area}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Globe className="size-3.5" />
                    {p.language.toUpperCase()}
                  </span>
                  {p.published_at && <span>{yearOf(p.published_at)}</span>}
                  {p.doi && <span className="font-mono">DOI: {p.doi}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <BrandFooter />
    </div>
  );
}
