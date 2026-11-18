/**
 * Elementos pré-textuais e numeração de seções no padrão ABNT (NBR 14724).
 *
 * A ABNT não dispensa a capa nem a folha de rosto em trabalhos acadêmicos:
 * a capa traz autor, título e local/ano; a folha de rosto repete autor, título
 * e acrescenta a NOTA de natureza do trabalho (o "para quê"), com o local/ano
 * ao pé. As seções são numeradas progressivamente (1, 1.1, 1.1.1).
 *
 * Nada aqui é inventado sobre a norma: o pesquisador informa autor, instituição,
 * cidade, ano e a natureza; o sistema apenas organiza o que foi informado.
 */
import type { Block } from "@/lib/article-blocks";

/** Metadados de identificação do trabalho (capa/folha de rosto). */
export type DocumentMeta = {
  author: string;
  institution: string | null;
  city: string | null;
  year: string | null;
  /** Nota de natureza do trabalho, exibida na folha de rosto. */
  nature: string;
  /**
   * ORCID do pesquisador (identificador pessoal, não institucional). É opcional
   * na folha de rosto, mas é a credencial que dispensa o vínculo institucional.
   */
  orcid: string | null;
};

// --- ORCID ------------------------------------------------------------------

const ORCID_DIGITS = /^\d{15}[\dX]$/;

/** Normaliza para o formato canônico 0000-0000-0000-0000 (ou null se vazio). */
export function normalizeOrcid(value: string | null | undefined): string | null {
  const digits = (value ?? "").toUpperCase().replace(/[^0-9X]/g, "");
  if (!digits) return null;
  if (digits.length !== 16) return digits; // deixa incompleto visível para o pesquisador corrigir
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Valida o ORCID pelo dígito verificador (ISO 7064 MOD 11-2). Não confirma que
 * o registro existe — só que o número não foi digitado errado.
 */
export function isValidOrcid(value: string | null | undefined): boolean {
  const digits = (value ?? "").toUpperCase().replace(/[^0-9X]/g, "");
  if (!ORCID_DIGITS.test(digits)) return false;
  let total = 0;
  for (const ch of digits.slice(0, 15)) total = (total + Number(ch)) * 2;
  const remainder = total % 11;
  const check = (12 - remainder) % 11;
  const expected = check === 10 ? "X" : String(check);
  return expected === digits[15];
}

/** URL pública do ORCID (para citação/rodapé). */
export function orcidUrl(orcid: string): string {
  return `https://orcid.org/${normalizeOrcid(orcid) ?? orcid}`;
}

export const DEFAULT_NATURE =
  "Artigo científico elaborado a partir da pesquisa desenvolvida pelo(a) autor(a).";

/** Ano corrente, quando o pesquisador não informa. */
export function currentYear(): string {
  return String(new Date().getFullYear());
}

/**
 * Normaliza os metadados: o autor cai para o nome do pesquisador logado e o ano
 * para o corrente. Campos vazios viram `null` (não renderizam linha).
 */
export function resolveDocumentMeta(
  input: Partial<DocumentMeta> | null | undefined,
  fallbackAuthor: string,
): DocumentMeta {
  const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
  return {
    author: clean(input?.author) ?? fallbackAuthor,
    institution: clean(input?.institution),
    city: clean(input?.city),
    year: clean(input?.year) ?? currentYear(),
    nature: clean(input?.nature) ?? DEFAULT_NATURE,
    orcid: normalizeOrcid(input?.orcid),
  };
}

/**
 * Mescla metadados que chegam de um formulário sobre os já gravados. O ORCID é
 * capturado pelo chat (não pelo painel editorial), então quando o formulário não
 * o traz, preservamos o valor existente em vez de apagá-lo.
 */
export function mergeDocumentMeta(
  incoming: Partial<DocumentMeta> | null | undefined,
  existing: Partial<DocumentMeta> | null | undefined,
): Partial<DocumentMeta> {
  return { ...incoming, orcid: incoming?.orcid ?? existing?.orcid ?? null };
}

/** Linha de local/ano ao pé da capa e da folha de rosto: "CIDADE — 2026". */
export function placeLine(city: string | null, year: string | null): string {
  const c = city?.trim().toUpperCase() ?? "";
  const y = year?.trim() ?? "";
  if (c && y) return `${c} — ${y}`;
  return c || y;
}

export type FrontMatter = {
  author: string;
  title: string;
  institution: string | null;
  nature: string;
  place: string;
  /** ORCID já normalizado (ou null). Exibido na folha de rosto quando presente. */
  orcid: string | null;
};

/** Reúne os dados de capa e folha de rosto a partir dos metadados e do título. */
export function buildFrontMatter(meta: DocumentMeta, title: string): FrontMatter {
  return {
    author: meta.author,
    title: title.trim() || "Artigo científico",
    institution: meta.institution,
    nature: meta.nature,
    place: placeLine(meta.city, meta.year),
    orcid: normalizeOrcid(meta.orcid),
  };
}

/**
 * Elementos pré-textuais como blocos tipados: capa e folha de rosto. Cada um
 * ocupa uma folha inteira (a folha A4 mede pelo menos a altura útil; os formatos
 * com layout inserem a quebra de página explicitamente — ver `frontMatterSequence`).
 */
export function frontMatterBlocks(fm: FrontMatter): Block[] {
  return [
    {
      type: "frontmatter",
      kind: "cover",
      author: fm.author,
      title: fm.title,
      place: fm.place,
      orcid: fm.orcid,
    },
    {
      type: "frontmatter",
      kind: "titlepage",
      author: fm.author,
      title: fm.title,
      institution: fm.institution,
      nature: fm.nature,
      place: fm.place,
      orcid: fm.orcid,
    },
  ];
}

/**
 * Elementos pré-textuais com quebras de página explícitas, para formatos que não
 * paginam por altura (DOCX, HTML, LaTeX).
 */
export function frontMatterSequence(fm: FrontMatter): Block[] {
  return [
    frontMatterBlocks(fm)[0]!,
    { type: "pagebreak" },
    frontMatterBlocks(fm)[1]!,
    { type: "pagebreak" },
  ];
}

/** Capa e folha de rosto em texto simples (para .md/.txt sem layout). */
export function frontMatterMarkdown(fm: FrontMatter): string {
  const lines = [fm.author, "", `# ${fm.title}`, ""];
  if (fm.institution) lines.push(fm.institution, "");
  if (fm.orcid) lines.push(`ORCID: ${fm.orcid}`, "");
  lines.push(fm.nature, "", fm.place, "");
  return lines.join("\n");
}

// --- Numeração de seções ----------------------------------------------------

const LEADING_NUMBER = /^\s*\d+(?:\.\d+)*[\s.)-]/;

/** "1", "1.1", "1.1.1" a partir do contador por profundidade. */
function sectionLabel(counters: number[]): string {
  return counters.join(".");
}

/**
 * Numera os títulos de seção progressivamente (1, 1.1, 1.1.1), no padrão ABNT.
 * O título do trabalho (primeiro título de nível 1) não é numerado. Títulos que
 * já começam com número são preservados, para não duplicar a numeração.
 */
export function numberSections(blocks: Block[]): Block[] {
  const headingIndexes = blocks
    .map((b, i) => (b.type === "heading" ? i : -1))
    .filter((i) => i >= 0);
  if (headingIndexes.length === 0) return blocks;

  // O título é o primeiro título, desde que seja de nível 1 e esteja no topo.
  const firstIdx = headingIndexes[0]!;
  const firstBlock = blocks[firstIdx];
  const hasTitle = firstBlock?.type === "heading" && firstBlock.level === 1;

  const numbered = headingIndexes.filter((i) => !(hasTitle && i === firstIdx));
  if (numbered.length === 0) return blocks;
  const baseLevel = Math.min(
    ...numbered.map((i) => {
      const b = blocks[i];
      return b?.type === "heading" ? b.level : 2;
    }),
  );

  const counters: number[] = [];
  const out = [...blocks];
  for (const i of numbered) {
    const block = out[i];
    if (block?.type !== "heading") continue;
    const depth = block.level - baseLevel; // 0 = seção, 1 = subseção, …
    counters[depth] = (counters[depth] ?? 0) + 1;
    counters.length = depth + 1;
    const text = block.text.trim();
    if (LEADING_NUMBER.test(text)) continue; // já numerado pelo pesquisador
    out[i] = { ...block, text: `${sectionLabel(counters)} ${text}` };
  }
  return out;
}
