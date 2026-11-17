/**
 * Perfis de formatação por norma editorial. A norma NÃO é fixa: cada usuário
 * escolhe o padrão no painel Editorial (ABNT é o default brasileiro), e a
 * exportação (DOCX/HTML/LaTeX) e a folha A4 na tela aplicam o perfil escolhido.
 *
 * Cada perfil reúne o que muda entre normas: margens, fonte, tamanho,
 * entrelinha, recuo de parágrafo, recuo/tamanho da citação longa e tratamento
 * das referências. Não inventamos exigências: os valores abaixo são os das
 * normas citadas (ABNT NBR 14724/10520; APA 7; IEEE; Vancouver; Chicago).
 */
import type { CitationStandard } from "@/lib/editorial";

export type FormatProfile = {
  /** Identificador da norma (mesmo vocabulário de `CitationStandard`). */
  standard: CitationStandard;
  /** Nome legível para a UI. */
  label: string;
  fontFamily: string;
  /** Corpo do texto, em pontos. */
  fontSizePt: number;
  /** Entrelinha como múltiplo da linha simples (1.5 = 1,5). */
  lineSpacing: number;
  margins: { topMm: number; rightMm: number; bottomMm: number; leftMm: number };
  /** Recuo da primeira linha do parágrafo, em mm (0 = sem recuo). */
  firstLineIndentMm: number;
  /** Espaço depois do parágrafo, em pontos. */
  spaceAfterPt: number;
  justify: boolean;
  /** Citação longa (mais de ~3 linhas). */
  longQuote: { indentMm: number; fontSizePt: number; lineSpacing: number };
  /** Referências: espaço simples e alinhadas à esquerda (ABNT/Vancouver). */
  references: { fontSizePt: number; lineSpacing: number; hangingIndentMm: number };
  /** Paginação no canto superior direito (ABNT) vs. rodapé. */
  pageNumber: "top-right" | "bottom-center";
  /** Títulos de seção: caixa alta (ABNT) ou capitalizados. */
  headingUppercase: boolean;
};

const ABNT: FormatProfile = {
  standard: "abnt",
  label: "ABNT (NBR 14724)",
  fontFamily: "Times New Roman",
  fontSizePt: 12,
  lineSpacing: 1.5,
  margins: { topMm: 30, rightMm: 20, bottomMm: 20, leftMm: 30 },
  firstLineIndentMm: 12.5,
  spaceAfterPt: 0,
  justify: true,
  longQuote: { indentMm: 40, fontSizePt: 10, lineSpacing: 1 },
  references: { fontSizePt: 12, lineSpacing: 1, hangingIndentMm: 0 },
  pageNumber: "top-right",
  headingUppercase: true,
};

const APA: FormatProfile = {
  standard: "apa",
  label: "APA 7ª edição",
  fontFamily: "Times New Roman",
  fontSizePt: 12,
  lineSpacing: 2,
  margins: { topMm: 25.4, rightMm: 25.4, bottomMm: 25.4, leftMm: 25.4 },
  firstLineIndentMm: 12.7,
  spaceAfterPt: 0,
  justify: false,
  longQuote: { indentMm: 12.7, fontSizePt: 12, lineSpacing: 2 },
  references: { fontSizePt: 12, lineSpacing: 2, hangingIndentMm: 12.7 },
  pageNumber: "top-right",
  headingUppercase: false,
};

const IEEE: FormatProfile = {
  standard: "ieee",
  label: "IEEE",
  fontFamily: "Times New Roman",
  fontSizePt: 10,
  lineSpacing: 1,
  margins: { topMm: 19, rightMm: 19, bottomMm: 25, leftMm: 19 },
  firstLineIndentMm: 3.5,
  spaceAfterPt: 0,
  justify: true,
  longQuote: { indentMm: 6, fontSizePt: 9, lineSpacing: 1 },
  references: { fontSizePt: 8, lineSpacing: 1, hangingIndentMm: 3.5 },
  pageNumber: "bottom-center",
  headingUppercase: false,
};

const VANCOUVER: FormatProfile = {
  standard: "vancouver",
  label: "Vancouver",
  fontFamily: "Times New Roman",
  fontSizePt: 12,
  lineSpacing: 1.5,
  margins: { topMm: 25.4, rightMm: 25.4, bottomMm: 25.4, leftMm: 25.4 },
  firstLineIndentMm: 0,
  spaceAfterPt: 6,
  justify: true,
  longQuote: { indentMm: 12, fontSizePt: 11, lineSpacing: 1 },
  references: { fontSizePt: 11, lineSpacing: 1, hangingIndentMm: 0 },
  pageNumber: "top-right",
  headingUppercase: false,
};

const CHICAGO: FormatProfile = {
  standard: "chicago",
  label: "Chicago",
  fontFamily: "Times New Roman",
  fontSizePt: 12,
  lineSpacing: 2,
  margins: { topMm: 25.4, rightMm: 25.4, bottomMm: 25.4, leftMm: 25.4 },
  firstLineIndentMm: 12.7,
  spaceAfterPt: 0,
  justify: false,
  longQuote: { indentMm: 12.7, fontSizePt: 11, lineSpacing: 1 },
  references: { fontSizePt: 12, lineSpacing: 2, hangingIndentMm: 12.7 },
  pageNumber: "top-right",
  headingUppercase: false,
};

/** Normas sem perfil próprio (Udelar/própria) herdam a base ABNT, ajustável. */
const UDELAR: FormatProfile = {
  ...ABNT,
  standard: "udelar",
  label: "Normas da Udelar (base ABNT)",
};
const PROPRIA: FormatProfile = {
  ...ABNT,
  standard: "propria",
  label: "Estrutura própria (base ABNT)",
};

export const FORMAT_PROFILES: Record<CitationStandard, FormatProfile> = {
  abnt: ABNT,
  apa: APA,
  ieee: IEEE,
  vancouver: VANCOUVER,
  chicago: CHICAGO,
  udelar: UDELAR,
  propria: PROPRIA,
};

export function formatProfile(standard: CitationStandard | null | undefined): FormatProfile {
  return FORMAT_PROFILES[standard ?? "abnt"] ?? ABNT;
}

/** Milímetros → twips (1 in = 1440 twips; 1 in = 25,4 mm). */
export function mmToTwips(mm: number): number {
  return Math.round((mm / 25.4) * 1440);
}

/** Pontos → meios-pontos (formato `w:sz` do OOXML). */
export function ptToHalfPoints(pt: number): number {
  return Math.round(pt * 2);
}

/** Múltiplo de entrelinha → valor `w:line` (240 = linha simples). */
export function lineToTwips(multiplier: number): number {
  return Math.round(240 * multiplier);
}
