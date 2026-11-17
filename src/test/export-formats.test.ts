import { describe, expect, it } from "vitest";
import { buildDocx, crc32, markdownToDocumentXml, zipStore } from "@/lib/docx";
import { markdownToHtml, markdownToLatex } from "@/lib/export-formats";

const MARKDOWN = `# Meu artigo

## Introdução

Texto **importante** com ênfase.

- primeiro item
- segundo item

| Métrica | Valor |
| --- | --- |
| A | 1 |

> Uma citação.

---

Fim.`;

function readUint32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true);
}

describe("exportação DOCX (ZIP/OOXML)", () => {
  it("calcula o CRC-32 conhecido", () => {
    // CRC-32 de "123456789" é 0xCBF43926.
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("gera um ZIP válido com assinaturas e nomes", () => {
    const zip = zipStore([
      { name: "a.txt", data: new TextEncoder().encode("olá") },
      { name: "b.txt", data: new TextEncoder().encode("mundo") },
    ]);
    expect(readUint32(zip, 0)).toBe(0x04034b50); // assinatura local
    const text = new TextDecoder("latin1").decode(zip);
    expect(text).toContain("a.txt");
    expect(text).toContain("b.txt");
    expect(readUint32(zip, zip.length - 22)).toBe(0x06054b50); // EOCD
  });

  it("converte Markdown em WordprocessingML com estilos e tabelas", () => {
    const xml = markdownToDocumentXml(MARKDOWN);
    expect(xml).toContain('w:pStyle w:val="Heading1"');
    expect(xml).toContain('w:pStyle w:val="Heading2"');
    expect(xml).toContain("<w:b/>");
    expect(xml).toContain("<w:tbl>");
    expect(xml).toContain("<w:numPr>");
  });

  it("gera um .docx completo com as partes obrigatórias", () => {
    const docx = buildDocx({ title: "Meu artigo", author: "Autora", markdown: MARKDOWN });
    const text = new TextDecoder("latin1").decode(docx);
    expect(text).toContain("[Content_Types].xml");
    expect(text).toContain("word/document.xml");
    expect(text).toContain("word/styles.xml");
    expect(text).toContain("docProps/core.xml");
    expect(readUint32(docx, 0)).toBe(0x04034b50);
  });

  it("aplica ABNT: Times New Roman 12, margens 3/2 cm e entrelinha 1,5", () => {
    const docx = buildDocx({ title: "T", author: "A", markdown: MARKDOWN, standard: "abnt" });
    const text = new TextDecoder("latin1").decode(docx);
    expect(text).toContain('w:ascii="Times New Roman"');
    expect(text).toContain('<w:sz w:val="24"/>');
    expect(text).toContain('w:line="360"');
    expect(text).toContain('w:top="1701"');
    expect(text).toContain('w:left="1701"');
    expect(text).toContain('w:bottom="1134"');
    expect(text).toContain('w:right="1134"');
    expect(text).toContain("word/header1.xml");
  });

  it("aplica recuo de primeira linha e referencias em espaco simples (ABNT)", () => {
    const md =
      "## Introducao\n\nTexto normal.\n\n## Referencias\n\nSILVA, A. Obra. Sao Paulo, 2020.";
    const xml = markdownToDocumentXml(md);
    expect(xml).toContain("<w:ind w:firstLine=");
    expect(xml).toContain('w:pStyle w:val="References"');
  });

  it("respeita o perfil APA (margens iguais e entrelinha dupla)", () => {
    const docx = buildDocx({ title: "T", markdown: MARKDOWN, standard: "apa" });
    const text = new TextDecoder("latin1").decode(docx);
    expect(text).toContain('w:line="480"');
    expect(text).toContain('w:top="1440"');
  });
});

describe("exportação LaTeX", () => {
  it("escapa caracteres reservados", () => {
    const tex = markdownToLatex("Preço de 100% & taxa_extra", "Título", "Autor");
    expect(tex).toContain("\\%");
    expect(tex).toContain("\\&");
    expect(tex).toContain("\\_");
    expect(tex).toContain("\\documentclass");
    expect(tex).toContain("\\begin{document}");
  });

  it("converte títulos, listas e tabelas", () => {
    const tex = markdownToLatex(MARKDOWN, "T", "A");
    expect(tex).toContain("\\section{Meu artigo}");
    expect(tex).toContain("\\subsection{Introdução}");
    expect(tex).toContain("\\begin{itemize}");
    expect(tex).toContain("\\begin{tabular}");
    expect(tex).toContain("\\textbf{importante}");
  });
});

describe("exportação HTML", () => {
  it("gera um documento autocontido com títulos e tabelas", () => {
    const html = markdownToHtml(MARKDOWN, "Meu artigo", "Autora");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<h1>Meu artigo</h1>");
    expect(html).toContain("<h2>Introdução</h2>");
    expect(html).toContain("<table>");
    expect(html).toContain("<strong>importante</strong>");
    expect(html).toContain("<blockquote>");
  });

  it("escapa HTML no texto", () => {
    const html = markdownToHtml("Texto com <script> e & perigoso", "T", "A");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("elementos pré-textuais (ABNT)", () => {
  const fm = {
    author: "John Adrian",
    title: "Relatório Técnico",
    institution: "UFSC",
    nature: "Trabalho apresentado ao Programa de Pós-Graduação.",
    place: "FLORIANÓPOLIS — 2026",
  };

  it("HTML inclui capa e folha de rosto com nota e quebra de página", () => {
    const html = markdownToHtml(
      "## Introdução\n\nTexto.",
      "Relatório Técnico",
      "John Adrian",
      "abnt",
      fm,
    );
    expect(html).toContain('class="frontmatter cover"');
    expect(html).toContain('class="frontmatter titlepage"');
    expect(html).toContain("Trabalho apresentado ao Programa");
    expect(html).toContain("FLORIANÓPOLIS — 2026");
    expect(html).toContain('class="page-break"');
    // Sem cabeçalho automático quando há elementos pré-textuais.
    expect(html).not.toContain("<header>");
  });

  it("DOCX insere quebra de página e o texto da nota", () => {
    const docx = buildDocx({
      title: "Relatório Técnico",
      author: "John Adrian",
      markdown: "## Introdução\n\nTexto.",
      standard: "abnt",
      frontMatter: fm,
    });
    const text = new TextDecoder("latin1").decode(docx);
    expect(text).toContain('w:br w:type="page"');
    expect(text).toContain("Trabalho apresentado ao Programa");
    expect(text).toContain("UFSC");
  });

  it("LaTeX substitui o \\maketitle pela capa", () => {
    const tex = markdownToLatex(
      "## Introdução\n\nTexto.",
      "Relatório Técnico",
      "John Adrian",
      "abnt",
      fm,
    );
    expect(tex).toContain("\\thispagestyle{empty}");
    expect(tex).toContain("\\newpage");
    expect(tex).not.toContain("\\maketitle");
  });
});
