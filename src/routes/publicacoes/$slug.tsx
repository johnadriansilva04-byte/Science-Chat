import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, BookOpen, Copy, Printer, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { getPublicPublication } from "@/lib/publication.functions";
import { publicationCitation, contentHasAbstract, yearOf } from "@/lib/publication";
import { ACERVO_HOMAGES } from "@/lib/acervo";
import { MessageResponse } from "@/components/ai-elements/message";
import { AppHeader } from "@/components/app/AppHeader";
import { BookReader } from "@/components/app/BookReader";
import { Button } from "@/components/ui/button";
import { BrandFooter } from "@/components/app/BrandFooter";
import logo from "@/assets/sciencechat-logo.png";

export const Route = createFileRoute("/publicacoes/$slug")({
  head: () => ({
    meta: [
      { title: "Publicação — ScienceChat" },
      {
        name: "description",
        content: "Artigo publicado na ScienceChat.",
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
  const [reading, setReading] = useState(false);

  useEffect(() => {
    let active = true;
    getPublicPublication({ data: { slug } })
      .then((row) => {
        if (!active) return;
        if (row) {
          setPub(row);
          setState("ok");
          // Ler um artigo é abrir o livro: a ficha fica atrás, para citação e metadados.
          setReading(true);
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
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (state === "missing" || !pub) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
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
    <div className="min-h-screen">
      <AppHeader />
      <div className="border-b bg-card/60 print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-6 py-2">
          <Link
            to="/publicacoes"
            className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Publicações
          </Link>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
            <Button size="sm" onClick={() => setReading(true)}>
              <BookOpen />
              Ler como livro
            </Button>
            <Button
              size="sm"
              variant="ghost"
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
            <Button size="sm" variant="ghost" onClick={() => window.print()}>
              <Printer />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <img src={logo} alt="" width={20} height={20} />
          {pub.review_status === "revisado" ? (
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <BadgeCheck className="size-3.5" />
              Revisado por pares
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
              <ScrollText className="size-3.5" />
              Ainda não revisado
            </span>
          )}
          {pub.area && <span>· {pub.area}</span>}
          <span>· {pub.language.toUpperCase()}</span>
          {year && <span>· {year}</span>}
        </div>

        <h1 className="font-serif text-3xl font-semibold leading-tight">{pub.title}</h1>
        {ACERVO_HOMAGES[pub.slug] && (
          <p className="acervo-homage__dedication mt-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            {ACERVO_HOMAGES[pub.slug]!.dedication}
          </p>
        )}
        <p className="mt-3 text-sm">
          <span className="font-medium">{pub.author_name}</span>
          {pub.affiliation && <span className="text-muted-foreground"> — {pub.affiliation}</span>}
          {pub.orcid && (
            <span className="ml-2 font-mono text-xs text-muted-foreground">ORCID: {pub.orcid}</span>
          )}
        </p>

        {pub.review_status !== "revisado" && (
          <p className="mt-5 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Este artigo ainda{" "}
            <strong className="text-foreground">não passou por revisão por pares</strong>. Ele está
            publicado no mural para leitura e citação, mas não traz o selo de revisado — a revisão é
            feita pelas revistas e universidades, não pela ScienceChat.
          </p>
        )}

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

        <div className="mt-8 flex flex-wrap items-center gap-3 print:hidden">
          <Button size="lg" onClick={() => setReading(true)}>
            <BookOpen />
            Abrir em modo livro
          </Button>
          <span className="text-xs text-muted-foreground">
            Leitura em tela cheia, uma folha por vez.
          </span>
        </div>

        {/* Na tela, o artigo vive no modo livro; este bloco existe para a
            impressão/PDF sair com o texto integral. */}
        <article className="prose-sciencechat mt-8 hidden max-w-none print:block">
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
      {reading && (
        <BookReader title={pub.title} content={pub.content} onClose={() => setReading(false)} />
      )}
    </div>
  );
}
