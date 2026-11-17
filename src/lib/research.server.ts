/**
 * Pesquisa em bases públicas de literatura científica. Sem chave de API:
 * OpenAlex (principal) e Crossref (fallback). Só devolvemos o que a fonte
 * retornou — nada de referências inventadas.
 */

import { getEnv } from "@/lib/cf/bindings.server";

/** Lançado quando uma base responde 429/403 (cota esgotada). */
class RateLimitedError extends Error {
  constructor(source: string) {
    super(`rate limited: ${source}`);
    this.name = "RateLimitedError";
  }
}

export type ResearchHit = {
  title: string;
  authors: string;
  year: number | null;
  venue: string;
  doi: string | null;
  url: string | null;
  source: "openalex" | "crossref";
};

type OpenAlexWork = {
  display_name?: string;
  publication_year?: number;
  doi?: string;
  authorships?: { author?: { display_name?: string } }[];
  primary_location?: { source?: { display_name?: string } };
};

type CrossrefItem = {
  title?: string[];
  author?: { given?: string; family?: string }[];
  issued?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  DOI?: string;
  URL?: string;
};

function yearOf(value: unknown): number | null {
  return typeof value === "number" && value > 0 ? value : null;
}

async function searchOpenAlex(query: string, limit: number): Promise<ResearchHit[]> {
  const key = getEnv().OPENALEX_API_KEY;
  const auth = key ? `&api_key=${encodeURIComponent(key)}` : "";
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&sort=relevance_score:desc&mailto=sciencechat@example.org${auth}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  // 429/403 = cota da base esgotada. Não é "nenhum resultado": sinalizamos para
  // o chamador tentar o Crossref e avisar que a busca foi degradada.
  if (res.status === 429 || res.status === 403) throw new RateLimitedError("openalex");
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: OpenAlexWork[] };
  return (data.results ?? []).map((w) => ({
    title: (w.display_name ?? "").trim() || "Sem título",
    authors: (w.authorships ?? [])
      .map((a) => a.author?.display_name)
      .filter((n): n is string => Boolean(n))
      .slice(0, 6)
      .join("; "),
    year: yearOf(w.publication_year),
    venue: w.primary_location?.source?.display_name ?? "",
    doi: w.doi ? w.doi.replace(/^https?:\/\/doi\.org\//, "") : null,
    url: w.doi ?? null,
    source: "openalex",
  }));
}

async function searchCrossref(query: string, limit: number): Promise<ResearchHit[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}&select=title,author,issued,container-title,DOI,URL`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "ScienceChat/1.0 (mailto:sciencechat@example.org)",
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { message?: { items?: CrossrefItem[] } };
  return (data.message?.items ?? []).map((it) => ({
    title: (it.title?.[0] ?? "").trim() || "Sem título",
    authors: (it.author ?? [])
      .map((a) => [a.given, a.family].filter(Boolean).join(" "))
      .filter(Boolean)
      .slice(0, 6)
      .join("; "),
    year: yearOf(it.issued?.["date-parts"]?.[0]?.[0]),
    venue: it["container-title"]?.[0] ?? "",
    doi: it.DOI ?? null,
    url: it.URL ?? null,
    source: "crossref",
  }));
}

/**
 * Resultado da busca, com o estado das fontes. `degraded` indica que a base
 * principal (OpenAlex) estava indisponível e caímos no Crossref, cujos
 * resultados por palavra-chave são menos precisos — o chamador deve avisar o
 * pesquisador em vez de apresentar tudo como igual.
 */
export type ResearchResult = {
  hits: ResearchHit[];
  degraded: boolean;
  source: "openalex" | "crossref" | "none";
};

/** Consulta OpenAlex e, se ele falhar/estiver limitado, tenta o Crossref. */
export async function searchLiterature(query: string, limit = 8): Promise<ResearchResult> {
  const q = query.trim();
  if (!q) return { hits: [], degraded: false, source: "none" };
  const capped = Math.min(Math.max(limit, 1), 20);

  let degraded = false;
  try {
    const hits = await searchOpenAlex(q, capped);
    if (hits.length) return { hits, degraded: false, source: "openalex" };
  } catch (error) {
    if (error instanceof RateLimitedError) degraded = true;
  }

  try {
    const hits = await searchCrossref(q, capped);
    return { hits, degraded, source: hits.length ? "crossref" : "none" };
  } catch {
    return { hits: [], degraded, source: "none" };
  }
}

/** Formata os resultados como texto curto e citável para o modelo. */
export function formatHits(hits: ResearchHit[], degraded = false): string {
  if (!hits.length) {
    return degraded
      ? "A base principal (OpenAlex) está temporariamente indisponível (cota esgotada) e o Crossref não retornou nada. NÃO invente referências: diga ao pesquisador que a busca falhou e tente de novo mais tarde."
      : "Nenhum resultado encontrado nas bases públicas para esta consulta.";
  }
  const body = hits
    .map((h, i) => {
      const meta = [h.authors, h.year ? String(h.year) : "", h.venue].filter(Boolean).join(" · ");
      const link = h.doi ? ` — DOI: ${h.doi}` : h.url ? ` — ${h.url}` : "";
      return `${i + 1}. ${h.title}${meta ? `\n   ${meta}` : ""}${link}`;
    })
    .join("\n");
  // Aviso explícito: quando caímos no Crossref, os resultados são por
  // palavra-chave e podem não ser os mais relevantes. O modelo precisa saber
  // disso para não tratá-los como a melhor evidência disponível.
  return degraded
    ? `[AVISO: a base principal (OpenAlex) estava com a cota esgotada; estes resultados vêm do Crossref (busca por palavra-chave, menos precisa). Verifique a relevância antes de citar.]\n${body}`
    : body;
}
