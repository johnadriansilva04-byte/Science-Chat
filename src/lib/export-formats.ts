/**
 * Conversão do Markdown aprovado para LaTeX e HTML. Não gera texto novo: apenas
 * reembala as páginas já aprovadas, preservando títulos, listas, tabelas e a
 * assinatura. Serve para a exportação em formatos acadêmicos.
 */
import { parseBlocks, parseInline, type Align, type Block } from "@/lib/article-blocks";
import { frontMatterSequence, type FrontMatter } from "@/lib/front-matter";
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
    case "pagebreak":
      return "\\newpage";
    case "frontmatter": {
      const center = (t: string, size = "\\large") =>
        `\\begin{center}${size} ${latexEscape(t)}\\end{center}`;
      const parts: string[] = ["\\thispagestyle{empty}"];
      if (block.kind === "cover") {
        parts.push(center(block.author, "\\large"), "\\vspace*{4cm}");
        parts.push(center(block.title, "\\Large\\bfseries"), "\\vfill");
        parts.push(center(block.place, "\\large"));
      } else {
        parts.push(center(block.author, "\\large"), "\\vspace*{2cm}");
        parts.push(center(block.title, "\\Large\\bfseries"), "\\vspace*{1.5cm}");
        if (block.institution) parts.push(center(block.institution, "\\normalsize"));
        if (block.orcid) parts.push(center(`ORCID: ${block.orcid}`, "\\normalsize"));
        parts.push("\\vspace*{1cm}");
        if (block.nature) {
          parts.push(
            `\\begin{flushright}\\begin{minipage}{0.5\\textwidth}\\small ${latexEscape(block.nature)}\\end{minipage}\\end{flushright}`,
          );
        }
        parts.push("\\vfill", center(block.place, "\\large"));
      }
      return parts.join("\n");
    }
  }
}

/** Converte o Markdown aprovado em um documento LaTeX completo, na norma dada. */
export function markdownToLatex(
  markdown: string,
  title: string,
  author?: string,
  standard: CitationStandard = "abnt",
  frontMatter?: FrontMatter | null,
): string {
  const p = formatProfile(standard);
  const blocks = [
    ...(frontMatter ? frontMatterSequence(frontMatter) : []),
    ...parseBlocks(markdown),
  ];
  const body = blocks.map(latexBlock).join("\n\n");
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
  // Com elementos pré-textuais, a capa/folha de rosto substituem o \maketitle.
  const titleBlock = frontMatter
    ? ""
    : `\\title{${latexEscape(title)}}
${author ? `\\author{${latexEscape(author)}}` : ""}
\\date{\\today}
`;
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
${titleBlock}\\begin{document}
${frontMatter ? "" : "\\maketitle\n"}${body}
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

function alignStyle(align: Align | undefined): string {
  return align ? ` style="text-align:${align}"` : "";
}

function htmlBlock(block: Block): string {
  switch (block.type) {
    case "heading":
      return `<h${block.level}${alignStyle(block.align)}>${htmlInline(block.text)}</h${block.level}>`;
    case "paragraph":
      return `<p${alignStyle(block.align)}>${htmlInline(block.text)}</p>`;
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
    case "pagebreak":
      return '<div class="page-break"></div>';
    case "frontmatter": {
      const cover = block.kind === "cover";
      const nature =
        !cover && block.nature ? `<p class="nature">${htmlEscape(block.nature)}</p>` : "";
      const institution =
        !cover && block.institution
          ? `<p class="institution">${htmlEscape(block.institution)}</p>`
          : "";
      const orcid =
        !cover && block.orcid ? `<p class="orcid">ORCID: ${htmlEscape(block.orcid)}</p>` : "";
      return `<section class="frontmatter ${cover ? "cover" : "titlepage"}">
<p class="author">${htmlEscape(block.author)}</p>
<h1 class="front-title">${htmlEscape(block.title)}</h1>
${institution}
${orcid}
${nature}
<p class="place">${htmlEscape(block.place)}</p>
</section>`;
    }
  }
}

/** Documento HTML autocontido, pronto para imprimir ou publicar, na norma dada. */
export function markdownToHtml(
  markdown: string,
  title: string,
  author?: string,
  standard: CitationStandard = "abnt",
  frontMatter?: FrontMatter | null,
): string {
  const p = formatProfile(standard);
  const blocks = [
    ...(frontMatter ? frontMatterSequence(frontMatter) : []),
    ...parseBlocks(markdown),
  ];
  const body = blocks.map(htmlBlock).join("\n");
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
.page-break { page-break-after: always; break-after: page; height: 0; }
.frontmatter { text-align: center; text-indent: 0; }
.frontmatter .author { font-weight: 700; text-indent: 0; }
.frontmatter .front-title { font-weight: 700; text-transform: uppercase; margin: 3em 0; }
.frontmatter .place { text-indent: 0; margin-top: 3em; }
.frontmatter.titlepage { display: flex; flex-direction: column; justify-content: space-between; min-height: 22cm; }
.frontmatter.titlepage .nature { text-align: right; text-indent: 0; margin: 1.5em 0 0 auto; max-width: 8cm; font-size: ${p.fontSizePt - 1}pt; }
.frontmatter.titlepage .place { margin-top: 0; }
@page { size: A4; margin: ${cm(m.topMm)}cm ${cm(m.rightMm)}cm ${cm(m.bottomMm)}cm ${cm(m.leftMm)}cm; }
@media print { body { padding: 0; max-width: none; } }
</style>
</head>
<body>
${
  frontMatter
    ? ""
    : `<header>
<h1>${htmlEscape(title)}</h1>
${author ? `<p style="text-align:center;text-indent:0">${htmlEscape(author)}</p>` : ""}
</header>`
}
${body}
</body>
</html>
`;
}
