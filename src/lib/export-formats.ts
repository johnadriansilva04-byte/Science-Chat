/**
 * Conversão do Markdown aprovado para LaTeX e HTML. Não gera texto novo: apenas
 * reembala as páginas já aprovadas, preservando títulos, listas, tabelas e a
 * assinatura. Serve para a exportação em formatos acadêmicos.
 */
import { parseBlocks, parseInline, type Block } from "@/lib/article-blocks";
import { formatProfile, type FormatProfile } from "@/lib/format-profile";
import type { CitationStandard } from "@/lib/editorial";

function latexEscape(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function latexInline(text: string): string {
  return parseInline(text)
    .map((seg) => (seg.bold ? `\\textbf{${latexEscape(seg.text)}}` : latexEscape(seg.text)))
    .join("");
}

function latexBlock(block: Block): string {
  switch (block.type) {
    case "heading": {
      const cmd =
        block.level === 1 ? "section" : block.level === 2 ? "subsection" : "subsubsection";
      return `\\${cmd}{${latexInline(block.text)}}`;
    }
    case "paragraph":
      return latexInline(block.text);
    case "list":
      return block.ordered
        ? `\\begin{enumerate}\n${block.items.map((i) => `\\item ${latexInline(i)}`).join("\n")}\n\\end{enumerate}`
        : `\\begin{itemize}\n${block.items.map((i) => `\\item ${latexInline(i)}`).join("\n")}\n\\end{itemize}`;
    case "quote":
      return `\\begin{quote}${latexInline(block.text)}\\end{quote}`;
    case "table": {
      const [head, ...rest] = block.rows;
      if (!head) return "";
      const cols = head.map(() => "l").join(" | ");
      const row = (cells: string[]) => cells.map(latexInline).join(" & ") + " \\\\";
      return `\\begin{tabular}{${cols}}\n\\hline\n${row(head)}\n\\hline\n${rest
        .map(row)
        .join("\n")}\n\\hline\n\\end{tabular}`;
    }
    case "rule":
      return "\\par\\noindent\\rule{\\linewidth}{0.4pt}\\par";
  }
}

/** Converte o Markdown aprovado em um documento LaTeX completo, na norma dada. */
export function markdownToLatex(
  markdown: string,
  title: string,
  author?: string,
  standard: CitationStandard = "abnt",
): string {
  const p = formatProfile(standard);
  const body = parseBlocks(markdown).map(latexBlock).join("\n\n");
  const spacing =
    p.lineSpacing >= 1.9
      ? "\\doublespacing"
      : p.lineSpacing >= 1.4
        ? "\\onehalfspacing"
        : "\\singlespacing";
  const indent = p.firstLineIndentMm
    ? `\\setlength{\\parindent}{${(p.firstLineIndentMm / 10).toFixed(2)}cm}`
    : "\\setlength{\\parindent}{0pt}";
  const m = p.margins;
  const cm = (mm: number) => (mm / 10).toFixed(2);
  return `\\documentclass[${p.fontSizePt}pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazilian]{babel}
\\usepackage[top=${cm(m.topMm)}cm,bottom=${cm(m.bottomMm)}cm,left=${cm(m.leftMm)}cm,right=${cm(m.rightMm)}cm]{geometry}
\\usepackage{booktabs}
\\usepackage{hyperref}
\\usepackage{setspace}
\\usepackage{times}
${spacing}
${indent}
\\title{${latexEscape(title)}}
${author ? `\\author{${latexEscape(author)}}` : ""}
\\date{\\today}
\\begin{document}
\\maketitle
${body}
\\end{document}
`;
}

function htmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlInline(text: string): string {
  return parseInline(text)
    .map((seg) => (seg.bold ? `<strong>${htmlEscape(seg.text)}</strong>` : htmlEscape(seg.text)))
    .join("");
}

function htmlBlock(block: Block): string {
  switch (block.type) {
    case "heading":
      return `<h${block.level}>${htmlInline(block.text)}</h${block.level}>`;
    case "paragraph":
      return `<p>${htmlInline(block.text)}</p>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag}>${block.items.map((i) => `<li>${htmlInline(i)}</li>`).join("")}</${tag}>`;
    }
    case "quote":
      return `<blockquote>${htmlInline(block.text)}</blockquote>`;
    case "table": {
      const [head, ...rest] = block.rows;
      if (!head) return "";
      return `<table><thead><tr>${head
        .map((c) => `<th>${htmlInline(c)}</th>`)
        .join("")}</tr></thead><tbody>${rest
        .map((r) => `<tr>${r.map((c) => `<td>${htmlInline(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
    }
    case "rule":
      return "<hr/>";
  }
}

/** Documento HTML autocontido, pronto para imprimir ou publicar, na norma dada. */
export function markdownToHtml(
  markdown: string,
  title: string,
  author?: string,
  standard: CitationStandard = "abnt",
): string {
  const p = formatProfile(standard);
  const body = parseBlocks(markdown).map(htmlBlock).join("\n");
  const m = p.margins;
  const cm = (mm: number) => (mm / 10).toFixed(2);
  const align = p.justify ? "justify" : "left";
  const h1Transform = p.headingUppercase ? "uppercase" : "none";
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${htmlEscape(title)}</title>
<style>
:root { color-scheme: light; }
body { font-family: "${p.fontFamily}", "Times New Roman", serif; font-size: ${p.fontSizePt}pt; line-height: ${p.lineSpacing}; max-width: 21cm; margin: 0 auto; padding: ${cm(m.topMm)}cm ${cm(m.rightMm)}cm ${cm(m.bottomMm)}cm ${cm(m.leftMm)}cm; color: #000; text-align: ${align}; }
h1 { font-size: ${p.fontSizePt + 4}pt; text-align: center; text-transform: ${h1Transform}; }
h2 { font-size: ${p.fontSizePt + 2}pt; margin-top: 1.5em; text-transform: ${h1Transform}; }
h3 { font-size: ${p.fontSizePt + 1}pt; text-transform: ${h1Transform}; }
p { text-indent: ${cm(p.firstLineIndentMm)}cm; margin: 0; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
th, td { border: 1px solid #bbb; padding: .4rem .6rem; text-align: left; }
blockquote { margin: 1rem 0 1rem ${cm(p.longQuote.indentMm)}cm; font-size: ${p.longQuote.fontSizePt}pt; line-height: ${p.longQuote.lineSpacing}; }
hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0; }
@page { size: A4; margin: ${cm(m.topMm)}cm ${cm(m.rightMm)}cm ${cm(m.bottomMm)}cm ${cm(m.leftMm)}cm; }
@media print { body { padding: 0; max-width: none; } }
</style>
</head>
<body>
<header>
<h1>${htmlEscape(title)}</h1>
${author ? `<p style="text-align:center;text-indent:0">${htmlEscape(author)}</p>` : ""}
</header>
${body}
</body>
</html>
`;
}
