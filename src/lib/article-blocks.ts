/**
 * Parser leve de Markdown em blocos tipados. Serve para duas coisas:
 * 1) renderizar o documento A4 medindo bloco a bloco (paginação real);
 * 2) permitir edição no próprio bloco, sem quebrar o restante.
 *
 * Não é um Markdown completo: cobre títulos, parágrafos, listas, citações,
 * tabelas simples e regras horizontais — o suficiente para artigos científicos.
 */
export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "rule" };

const HEADING = /^(#{1,4})\s+(.*)$/;
const RULE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const UL = /^\s*[-*+]\s+(.*)$/;
const OL = /^\s*\d+\.\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const level = Math.min(4, heading[1]?.length ?? 1) as 1 | 2 | 3 | 4;
      blocks.push({ type: "heading", level, text: heading[2]?.trim() ?? "" });
      i += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: "rule" });
      i += 1;
      continue;
    }

    if (TABLE_ROW.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i] ?? "")) {
        const cells = splitTableRow(lines[i] ?? "");
        // Linha separadora (|---|---|) do Markdown: ignorada.
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i += 1;
      }
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    }

    if (QUOTE.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i] ?? "")) {
        parts.push((lines[i] ?? "").match(QUOTE)?.[1] ?? "");
        i += 1;
      }
      blocks.push({ type: "quote", text: parts.join(" ").trim() });
      continue;
    }

    if (UL.test(line) || OL.test(line)) {
      const ordered = OL.test(line);
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i] ?? "";
        const m = ordered ? current.match(OL) : current.match(UL);
        if (!m) break;
        items.push(m[1]?.trim() ?? "");
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // Parágrafo: acumula até uma linha vazia ou o início de outro bloco.
    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = lines[i] ?? "";
      if (
        !current.trim() ||
        HEADING.test(current) ||
        RULE.test(current) ||
        UL.test(current) ||
        OL.test(current) ||
        QUOTE.test(current) ||
        TABLE_ROW.test(current)
      ) {
        break;
      }
      paragraph.push(current.trim());
      i += 1;
    }
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

export function serializeBlock(block: Block): string {
  switch (block.type) {
    case "heading":
      return `${"#".repeat(block.level)} ${block.text}`;
    case "paragraph":
      return block.text;
    case "list":
      return block.items.map((it, n) => (block.ordered ? `${n + 1}. ${it}` : `- ${it}`)).join("\n");
    case "quote":
      return `> ${block.text}`;
    case "table": {
      const [head, ...rest] = block.rows;
      if (!head) return "";
      const sep = head.map(() => "---");
      return [head, sep, ...rest].map((r) => `| ${r.join(" | ")} |`).join("\n");
    }
    case "rule":
      return "---";
  }
}

export function serializeBlocks(blocks: Block[]): string {
  return blocks.map(serializeBlock).join("\n\n").trim();
}

/** Chave estável de um bloco, usada para edição e realce por seção. */
export function blockKey(pageNumber: number, index: number): string {
  return `p${pageNumber}-b${index}`;
}

export type InlineSegment = { bold: boolean; text: string };

/** Divide um texto por marcadores **negrito** para renderização em segmentos. */
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    if (match.index > last) segments.push({ bold: false, text: text.slice(last, match.index) });
    segments.push({ bold: true, text: match[1] ?? "" });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ bold: false, text: text.slice(last) });
  return segments.length ? segments : [{ bold: false, text }];
}

/** Títulos de seção (níveis 1–2) do documento inteiro, com a folha em que aparecem. */
export function documentSections(
  pages: { block: Block }[][],
): { title: string; level: number; page: number }[] {
  const out: { title: string; level: number; page: number }[] = [];
  pages.forEach((blocks, pageIndex) => {
    blocks.forEach(({ block }) => {
      if (block.type === "heading" && block.level <= 2) {
        out.push({ title: block.text, level: block.level, page: pageIndex + 1 });
      }
    });
  });
  return out;
}
