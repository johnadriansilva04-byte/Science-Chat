/**
 * Pesquisa em bases públicas de literatura científica. Sem chave de API:
 * OpenAlex (principal) e Crossref (fallback). Só devolvemos o que a fonte
 * retornou — nada de referências inventadas.
 */

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
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&sort=relevance_score:desc&mailto=sciencechat@example.org`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
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

/** Consulta OpenAlex e, se vier vazio, tenta o Crossref. */
export async function searchLiterature(query: string, limit = 8): Promise<ResearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const capped = Math.min(Math.max(limit, 1), 20);
  try {
    const hits = await searchOpenAlex(q, capped);
    if (hits.length) return hits;
  } catch {
    // segue para o Crossref
  }
  try {
    return await searchCrossref(q, capped);
  } catch {
    return [];
  }
}

/** Formata os resultados como texto curto e citável para o modelo. */
export function formatHits(hits: ResearchHit[]): string {
  if (!hits.length) return "Nenhum resultado encontrado nas bases públicas para esta consulta.";
  return hits
    .map((h, i) => {
      const meta = [h.authors, h.year ? String(h.year) : "", h.venue].filter(Boolean).join(" · ");
      const link = h.doi ? ` — DOI: ${h.doi}` : h.url ? ` — ${h.url}` : "";
      return `${i + 1}. ${h.title}${meta ? `\n   ${meta}` : ""}${link}`;
    })
    .join("\n");
}
