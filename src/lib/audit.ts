/**
 * Auditoria científica independente. Roda SEPARADA da geração: recebe o que já
 * foi aprovado e aponta problemas — nunca reescreve o texto sozinho. Verifica
 * coerência científica, coerência documental e integridade textual, e produz um
 * relatório legível (Markdown) com severidade por achado.
 *
 * Princípio: o auditor nunca inventa informação para "fechar" uma lacuna. Se
 * falta dado, ele registra a pendência e pede ao pesquisador.
 */
import { countWords } from "@/lib/article-page";
import { stripMarkers } from "@/lib/article-marker";
import { significantTokens } from "@/lib/traceability";

export type Severity = "alta" | "media" | "baixa";

export type Finding = {
  id: string;
  scope: "pagina" | "artigo" | "referencia" | "documento";
  scopeRef: string | null;
  severity: Severity;
  title: string;
  detail: string;
  where: string | null;
};

export type AuditInput = {
  title: string;
  pages: { page_number: number; content: string; status: string }[];
  claims?: {
    seq: number;
    text: string;
    category: string;
    state: string;
  }[];
  documentCount?: number;
  pendingMarkersInPages?: boolean;
};

export type AuditResult = {
  findings: Finding[];
  counts: Record<Severity, number>;
  report: string;
};

const SEVERITY_LABEL: Record<Severity, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

/** Citações/referências que ficaram marcadas para confirmar. */
export function pendingReferences(text: string): string[] {
  const out: string[] = [];
  const re =
    /\[(?:REFER[ÊE]NCIA A CONFIRMAR|REFER[ÊE]NCIA PENDENTE|CITA[ÇC][ÃA]O A CONFIRMAR)[^\]]*\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[0]);
  return out;
}

/** Marcadores de pendência deixados pela IA (dados/resultados que faltam). */
export function pendingData(text: string): string[] {
  const out: string[] = [];
  const re = /\[PENDENTE[^\]]*\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[0]);
  return out;
}

/** Citações no formato (Autor, ano) ou (Autor, 2020). */
export function inlineCitations(text: string): string[] {
  const out: string[] = [];
  const re = /\(([A-ZÁÉÍÓÚÂÊÔÃÕ][^()]{2,60}?,\s*(?:19|20)\d{2}[a-z]?)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[0]);
  return out;
}

/**
 * Detecta frases longas repetidas entre páginas diferentes — sintoma típico da
 * geração modular (a IA reinicia o raciocínio e repete o trecho anterior).
 */
export function repeatedSentences(
  pages: { page_number: number; content: string }[],
  minWords = 8,
): { sentence: string; pages: number[] }[] {
  const seen = new Map<string, Set<number>>();
  const originals = new Map<string, string>();
  for (const page of pages) {
    const sentences = stripMarkers(page.content)
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => countWords(s) >= minWords);
    for (const sentence of sentences) {
      const key = sentence
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      const set = seen.get(key) ?? new Set<number>();
      set.add(page.page_number);
      seen.set(key, set);
      if (!originals.has(key)) originals.set(key, sentence);
    }
  }
  return [...seen.entries()]
    .filter(([, pageSet]) => pageSet.size > 1)
    .map(([key, pageSet]) => ({
      sentence: originals.get(key) ?? key,
      pages: [...pageSet].sort((a, b) => a - b),
    }));
}

/**
 * Afirma hipótese/possibilidade como fato consumado. Heurística conservadora:
 * sentenças que começam com conectores de hipótese mas afirmam no presente.
 */
export function hypothesisAsFact(text: string): string[] {
  const out: string[] = [];
  const sentences = stripMarkers(text).split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const t = s.trim();
    if (!t) continue;
    if (
      /\b(poderia|seria poss[íi]vel|talvez|possivelmente|supostamente)\b/i.test(t) &&
      /\b(provou|demonstrou|comprovou|conclui-se que [ée] fato)\b/i.test(t)
    ) {
      out.push(t.slice(0, 200));
    }
  }
  return out;
}

/** Generalizações absolutas indevidas ("todos", "sempre", "nunca", "prova que"). */
export function overgeneralizations(text: string): string[] {
  const out: string[] = [];
  const sentences = stripMarkers(text).split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const t = s.trim();
    if (/\b(todos os|todas as|sempre|nunca|prova que|est[áa] provado que)\b/i.test(t)) {
      out.push(t.slice(0, 200));
    }
  }
  return out;
}

function pagesText(pages: AuditInput["pages"]): string {
  return pages
    .sort((a, b) => a.page_number - b.page_number)
    .map((p) => stripMarkers(p.content))
    .join("\n\n");
}

/** Executa a auditoria completa e devolve achados + relatório em Markdown. */
export function auditArticle(input: AuditInput): AuditResult {
  const findings: Finding[] = [];
  const approved = input.pages.filter((p) => p.status === "approved");
  const body = pagesText(input.pages);

  // --- Integridade textual ---------------------------------------------------
  const refs = pendingReferences(body);
  if (refs.length) {
    findings.push({
      id: "refs-pendentes",
      scope: "artigo",
      scopeRef: null,
      severity: "alta",
      title: `${refs.length} citação(ões) sem fonte confirmada`,
      detail:
        "Há citações marcadas para confirmar. Nenhuma referência deve permanecer sem fonte verificada antes da submissão.",
      where: refs.slice(0, 5).join(" · "),
    });
  }

  const pend = pendingData(body);
  if (pend.length) {
    findings.push({
      id: "dados-pendentes",
      scope: "artigo",
      scopeRef: null,
      severity: "media",
      title: `${pend.length} trecho(s) com dado pendente`,
      detail:
        "A IA deixou marcadores [PENDENTE] porque faltava informação. Preencha com o pesquisador — nunca invente o dado.",
      where: pend.slice(0, 5).join(" · "),
    });
  }

  const repeats = repeatedSentences(input.pages);
  if (repeats.length) {
    findings.push({
      id: "repeticoes",
      scope: "artigo",
      scopeRef: null,
      severity: "media",
      title: `${repeats.length} frase(s) repetida(s) entre páginas`,
      detail:
        "Repetições costumam vir da geração modular. Verifique se o trecho precisa ficar em apenas uma página.",
      where: repeats
        .slice(0, 3)
        .map((r) => `páginas ${r.pages.join(", ")}: "${r.sentence.slice(0, 60)}…"`)
        .join(" | "),
    });
  }

  const over = overgeneralizations(body);
  if (over.length) {
    findings.push({
      id: "generalizacoes",
      scope: "artigo",
      scopeRef: null,
      severity: "baixa",
      title: `${over.length} generalização(ões) absoluta(s)`,
      detail: "Afirmações com 'todos/sempre/nunca' costumam exigir delimitação de escopo.",
      where: over.slice(0, 3).join(" | "),
    });
  }

  const hypo = hypothesisAsFact(body);
  if (hypo.length) {
    findings.push({
      id: "hipotese-como-fato",
      scope: "artigo",
      scopeRef: null,
      severity: "alta",
      title: `${hypo.length} hipótese(s) apresentada(s) como fato`,
      detail: "Diferencie o que é hipótese em investigação do que foi efetivamente demonstrado.",
      where: hypo.slice(0, 3).join(" | "),
    });
  }

  // --- Coerência científica --------------------------------------------------
  const sections = new Set<string>();
  for (const p of input.pages) {
    for (const m of stripMarkers(p.content).matchAll(/^#{1,3}\s+(.+)$/gm)) {
      sections.add((m[1] ?? "").trim().toLowerCase());
    }
  }
  const has = (name: string) => [...sections].some((s) => s.includes(name));
  const missing: string[] = [];
  if (!has("introdu")) missing.push("introdução");
  if (!has("conclus")) missing.push("conclusão");
  if (!has("refer")) missing.push("referências");
  if (missing.length) {
    findings.push({
      id: "secoes-faltando",
      scope: "artigo",
      scopeRef: null,
      severity: "media",
      title: `Seção(ões) ausente(s): ${missing.join(", ")}`,
      detail:
        "Confirme se a ausência é intencional (a estrutura depende da natureza da pesquisa) ou se falta produzir a seção.",
      where: null,
    });
  }

  if (input.pages.length > 1) {
    const short = input.pages.filter((p) => countWords(stripMarkers(p.content)) < 400);
    if (short.length) {
      findings.push({
        id: "paginas-curtas",
        scope: "artigo",
        scopeRef: null,
        severity: "baixa",
        title: `${short.length} página(s) com menos de 400 palavras`,
        detail: "Páginas curtas podem indicar corte na geração ou omissão de conteúdo.",
        where: short.map((p) => `página ${p.page_number}`).join(", "),
      });
    }
  }

  // --- Coerência documental --------------------------------------------------
  if (input.claims) {
    const risky = input.claims.filter((c) =>
      ["nao_localizada", "nao_verificavel", "contradita"].includes(c.state),
    );
    if (risky.length) {
      findings.push({
        id: "afirmacoes-sem-prova",
        scope: "documento",
        scopeRef: null,
        severity: risky.some((c) => c.state === "contradita") ? "alta" : "media",
        title: `${risky.length} afirmação(ões) sem sustentação localizada`,
        detail:
          "Isto NÃO significa que sejam falsas — apenas que não foi encontrada prova nos documentos apresentados. Considere anexar evidência ou ajustar o texto.",
        where: risky
          .slice(0, 4)
          .map((c) => `Afirmação ${c.seq}: ${c.text.slice(0, 60)}…`)
          .join(" | "),
      });
    }
    const contraditas = input.claims.filter((c) => c.state === "contradita");
    if (contraditas.length) {
      findings.push({
        id: "afirmacoes-contraditas",
        scope: "documento",
        scopeRef: null,
        severity: "alta",
        title: `${contraditas.length} afirmação(ões) possivelmente contradita(s) por documento`,
        detail: "Revise o trecho: o documento aponta direção oposta à afirmação.",
        where: contraditas.map((c) => `Afirmação ${c.seq}`).join(", "),
      });
    }
    const withEvidence = input.claims.filter((c) => c.state === "sustentada").length;
    if (input.documentCount && withEvidence === 0) {
      findings.push({
        id: "dossie-sem-rastreabilidade",
        scope: "documento",
        scopeRef: null,
        severity: "baixa",
        title: "Nenhuma afirmação diretamente sustentada por documento",
        detail:
          "Há documentos no dossiê, mas nenhuma afirmação foi vinculada a um trecho. Vincule as evidências na matriz de rastreabilidade.",
        where: null,
      });
    }
  } else if ((input.documentCount ?? 0) === 0) {
    findings.push({
      id: "sem-documentos",
      scope: "documento",
      scopeRef: null,
      severity: "baixa",
      title: "Nenhum documento no dossiê",
      detail:
        "Trabalhos teóricos podem não exigir documentos. Se a pesquisa produz dados, anexe as provas para permitir a rastreabilidade.",
      where: null,
    });
  }

  // --- Montagem do relatório -------------------------------------------------
  const counts: Record<Severity, number> = { alta: 0, media: 0, baixa: 0 };
  for (const f of findings) counts[f.severity] += 1;
  const report = renderReport(input, findings, counts, approved.length);
  return { findings, counts, report };
}

function renderReport(
  input: AuditInput,
  findings: Finding[],
  counts: Record<Severity, number>,
  approvedCount: number,
): string {
  const lines: string[] = [];
  lines.push("# Relatório de auditoria científica");
  lines.push("");
  lines.push(`**Título avaliado:** ${input.title || "—"}`);
  lines.push(`**Páginas aprovadas:** ${approvedCount} de ${input.pages.length}`);
  lines.push(`**Achados:** ${counts.alta} alta · ${counts.media} média · ${counts.baixa} baixa`);
  lines.push("");
  if (!findings.length) {
    lines.push(
      "Nenhum problema encontrado nas verificações automáticas. A revisão humana continua recomendada.",
    );
    return lines.join("\n");
  }
  lines.push("## Achados");
  lines.push("");
  for (const f of findings) {
    lines.push(`### [${SEVERITY_LABEL[f.severity]}] ${f.title}`);
    lines.push(f.detail);
    if (f.where) lines.push(`_Onde:_ ${f.where}`);
    lines.push("");
  }
  lines.push("## Como proceder");
  lines.push("");
  lines.push(
    "Corrija os achados de severidade alta antes de submeter. Os de severidade média e baixa podem ser ajustados com o pesquisador. Nada foi alterado automaticamente no documento.",
  );
  return lines.join("\n");
}

/** Resumo curto (uma linha) para listar auditorias anteriores. */
export function auditSummary(result: AuditResult): string {
  const { alta, media, baixa } = result.counts;
  if (alta + media + baixa === 0) return "Sem achados";
  return `${alta} alta · ${media} média · ${baixa} baixa`;
}

/** Tokens usados para comparar continuidade entre páginas (auditoria global). */
export function continuityOverlap(a: string, b: string): number {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let hits = 0;
  for (const t of ta) if (tb.has(t)) hits += 1;
  return hits / ta.size;
}
