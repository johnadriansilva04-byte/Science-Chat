/**
 * Conversão do Markdown aprovado para LaTeX e HTML. Não gera texto novo: apenas
 * reembala as páginas já aprovadas, preservando títulos, listas, tabelas e a
 * assinatura. Serve para a exportação em formatos acadêmicos.
 */
import { parseBlocks, parseInline, type Block } from "@/lib/article-blocks";

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

/** Converte o Markdown aprovado em um documento LaTeX completo. */
export function markdownToLatex(markdown: string, title: string, author?: string): string {
  const body = parseBlocks(markdown).map(latexBlock).join("\n\n");
  return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[brazilian]{babel}
\\usepackage[margin=2.5cm]{geometry}
\\usepackage{booktabs}
\\usepackage{hyperref}
\\usepackage{setspace}
\\onehalfspacing
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

/** Documento HTML autocontido, pronto para imprimir ou publicar. */
export function markdownToHtml(markdown: string, title: string, author?: string): string {
  const body = parseBlocks(markdown).map(htmlBlock).join("\n");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${htmlEscape(title)}</title>
<style>
:root { color-scheme: light; }
body { font-family: Georgia, "Times New Roman", serif; line-height: 1.6; max-width: 46rem; margin: 0 auto; padding: 3rem 1.5rem; color: #1a1a1a; text-align: justify; }
h1 { font-size: 1.9rem; text-align: center; }
h2 { font-size: 1.4rem; margin-top: 2rem; }
h3 { font-size: 1.15rem; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
th, td { border: 1px solid #bbb; padding: .4rem .6rem; text-align: left; }
blockquote { border-left: 3px solid #999; margin: 1rem 0; padding-left: 1rem; color: #444; }
hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0; }
@media print { body { padding: 0; } }
</style>
</head>
<body>
<header>
<h1>${htmlEscape(title)}</h1>
${author ? `<p style="text-align:center">${htmlEscape(author)}</p>` : ""}
</header>
${body}
</body>
</html>
`;
}
