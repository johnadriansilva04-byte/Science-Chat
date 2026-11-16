import { MUSEUM_WORKS, museumDoiUrl, type MuseumWingId } from "@/lib/museum";
import type { PublicationSummary } from "@/lib/publication.functions";
import { yearOf } from "@/lib/publication";

/**
 * O acervo reúne duas origens independentes, mostradas na MESMA página e na
 * mesma linguagem visual, mas SEM se misturar:
 *
 * - **Clássicos** (`kind: "classico"`): as obras curadas do Museu — Einstein,
 *   Turing, Milgram e companhia. Metadados reais, com DOI, verificados em
 *   Crossref/OpenAlex. Ficam na seção "Clássicos do Museu", agrupadas pelas
 *   alas do museu. NÃO entram na seção "Revisados por pares".
 * - **Contribuições** (`kind: "contribuicao"`): artigos publicados pelos
 *   pesquisadores na própria ScienceChat. O selo de revisado só aparece quando
 *   o autor comprova a revisão (DOI/registro do aceite) — a plataforma não
 *   revisa. Sem comprovação, ficam em "Ainda não revisados".
 *
 * Este módulo é puro (sem rede/banco), para ser testável e reutilizado na home
 * e na página do mural.
 */
export type AcervoKind = "classico" | "contribuicao";

export type AcervoItem = {
  id: string;
  kind: AcervoKind;
  /** Título para exibição (pt-BR): tradução para clássicos, original p/ artigos. */
  title: string;
  /** Título original, quando houver (clássicos estrangeiros). */
  originalTitle: string | null;
  authors: string;
  year: string;
  /** Revista/veículo de origem, ou "ScienceChat" para contribuições. */
  venue: string;
  doi: string | null;
  doiUrl: string | null;
  /** Nota curada (clássicos) ou resumo (contribuições). */
  summary: string | null;
  tags: string[];
  area: string | null;
  /** Slug do artigo publicado, quando houver (contribuições). */
  slug: string | null;
  reviewed: boolean;
  wing: MuseumWingId | null;
};

export function classicsToAcervo(): AcervoItem[] {
  return MUSEUM_WORKS.map((w) => ({
    id: `classico:${w.id}`,
    kind: "classico",
    title: w.titlePt,
    originalTitle: w.title,
    authors: w.authors,
    year: String(w.year),
    venue: w.venue,
    doi: w.doi,
    doiUrl: museumDoiUrl(w.doi),
    summary: w.note,
    tags: w.tags,
    area: null,
    slug: null,
    reviewed: false,
    wing: w.wing,
  }));
}

export function publicationsToAcervo(pubs: PublicationSummary[]): AcervoItem[] {
  return pubs.map((p) => ({
    id: `contrib:${p.id}`,
    kind: "contribuicao",
    title: p.title,
    originalTitle: null,
    authors: p.author_name,
    year: yearOf(p.published_at),
    venue: "ScienceChat",
    doi: p.doi,
    doiUrl: p.doi ? museumDoiUrl(p.doi) : null,
    summary: p.abstract,
    tags: [],
    area: p.area,
    slug: p.slug,
    reviewed: p.review_status === "revisado",
    wing: null,
  }));
}

export type Acervo = {
  /** Clássicos do Museu, separados por ala. */
  classicsByWing: { wing: MuseumWingId; items: AcervoItem[] }[];
  classics: AcervoItem[];
  /** Contribuições com revisão comprovada pelo autor. */
  reviewed: AcervoItem[];
  /** Contribuições ainda sem comprovação. */
  notReviewed: AcervoItem[];
  counts: {
    classics: number;
    reviewed: number;
    notReviewed: number;
    total: number;
  };
};

export function buildAcervo(pubs: PublicationSummary[]): Acervo {
  const classics = classicsToAcervo();
  const contributions = publicationsToAcervo(pubs);
  const reviewed = contributions.filter((c) => c.reviewed);
  const notReviewed = contributions.filter((c) => !c.reviewed);

  const wings: MuseumWingId[] = ["revolucao", "poder", "mente"];
  const classicsByWing = wings
    .map((wing) => ({ wing, items: classics.filter((c) => c.wing === wing) }))
    .filter((g) => g.items.length > 0);

  return {
    classicsByWing,
    classics,
    reviewed,
    notReviewed,
    counts: {
      classics: classics.length,
      reviewed: reviewed.length,
      notReviewed: notReviewed.length,
      total: classics.length + contributions.length,
    },
  };
}
