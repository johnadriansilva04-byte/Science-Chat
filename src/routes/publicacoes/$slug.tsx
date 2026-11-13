import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { getPublicPublication } from "@/lib/publication.functions";
import { publicationCitation, contentHasAbstract, yearOf } from "@/lib/publication";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { BrandFooter } from "@/components/app/BrandFooter";
import logo from "@/assets/sciencechat-logo.png";

export const Route = createFileRoute("/publicacoes/$slug")({
  head: () => ({
    meta: [
      { title: "Publicação — ScienceChat" },
      {
        name: "description",
        content: "Artigo científico revisado por pares, publicado na ScienceChat.",
      },
    ],
  }),
  component: PublicationPage,
});

type PublicationData = Awaited<ReturnType<typeof getPublicPublication>>;

function PublicationPage() {
  const { slug } = Route.useParams();
  const [pub, setPub] = useState<PublicationData>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    let active = true;
    getPublicPublication({ data: { slug } })
      .then((row) => {
        if (!active) return;
        if (row) {
          setPub(row);
          setState("ok");
        } else {
          setState("missing");
        }
      })
      .catch(() => active && setState("missing"));
    return () => {
      active = false;
    };
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (state === "missing" || !pub) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-serif text-2xl font-semibold">Publicação não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          Este artigo não está publicado ou o endereço está incorreto.
        </p>
        <Link to="/publicacoes" className="text-sm text-primary hover:underline">
          Ver todas as publicações
        </Link>
      </div>
    );
  }

  const year = yearOf(pub.published_at);
  const citation = publicationCitation({
    author_name: pub.author_name,
    title: pub.title,
    year,
    doi: pub.doi,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-2 border-b px-4 py-3 print:hidden">
        <Link
          to="/publicacoes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Publicações
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(citation).then(
                () => toast.success("Citação copiada"),
                () => toast.error("Não foi possível copiar"),
              );
            }}
          >
            <Copy />
            Citar
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer />
            Imprimir / PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <img src={logo} alt="" width={20} height={20} />
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            <BadgeCheck className="size-3.5" />
            Revisado por pares
          </span>
          {pub.area && <span>· {pub.area}</span>}
          <span>· {pub.language.toUpperCase()}</span>
          {year && <span>· {year}</span>}
        </div>

        <h1 className="font-serif text-3xl font-semibold leading-tight">{pub.title}</h1>
        <p className="mt-3 text-sm">
          <span className="font-medium">{pub.author_name}</span>
          {pub.affiliation && <span className="text-muted-foreground"> — {pub.affiliation}</span>}
          {pub.orcid && (
            <span className="ml-2 font-mono text-xs text-muted-foreground">ORCID: {pub.orcid}</span>
          )}
        </p>

        {pub.abstract && !contentHasAbstract(pub.content) && (
          <section className="mt-6 rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Resumo
            </h2>
            <p className="mt-2 text-sm leading-relaxed">{pub.abstract}</p>
            {pub.keywords && (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium">Palavras-chave:</span> {pub.keywords}
              </p>
            )}
          </section>
        )}

        <article className="prose-sciencechat mt-8 max-w-none">
          <MessageResponse>{pub.content}</MessageResponse>
        </article>

        <section className="mt-10 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Como citar</p>
          <p className="mt-1">{citation}</p>
          {pub.doi && (
            <a
              className="mt-1 inline-block font-mono text-primary hover:underline"
              href={`https://doi.org/${pub.doi}`}
              target="_blank"
              rel="noreferrer"
            >
              https://doi.org/{pub.doi}
            </a>
          )}
        </section>
      </main>
      <BrandFooter />
    </div>
  );
}
