/**
 * Exportação DOCX (.docx) sem dependências externas: geramos o OOXML (um ZIP de
 * arquivos XML) diretamente em TypeScript, com método de armazenamento (sem
 * compressão), para rodar tanto no Worker quanto no navegador. O objetivo é
 * levar as páginas JÁ APROVADAS para o Word sem reescrever o texto com IA.
 */
import { parseBlocks, type Align, type Block } from "@/lib/article-blocks";
import { frontMatterSequence, type FrontMatter } from "@/lib/front-matter";
import {
  formatProfile,
  lineToTwips,
  mmToTwips,
  ptToHalfPoints,
  type FormatProfile,
} from "@/lib/format-profile";
import type { CitationStandard } from "@/lib/editorial";

/** CRC-32 (IEEE) — exigido pelo cabeçalho de cada entrada do ZIP. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type ZipEntry = { name: string; data: Uint8Array };

/** Escreve um ZIP com método "store" (0). Suficiente e legível para o Word. */
export function zipStore(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // assinatura
    lv.setUint16(4, 20, true); // versão necessária
    lv.setUint16(6, 0x0800, true); // flag UTF-8
    lv.setUint16(8, 0, true); // método: store
    lv.setUint16(10, 0, true); // hora
    lv.setUint16(12, 0x2821, true); // data (1980-01-01)
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    chunks.push(local, entry.data);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x2821, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    central.push(cd);

    offset += local.length + size;
  }

  const centralSize = central.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = chunks.reduce((sum, c) => sum + c.length, 0) + centralSize + end.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  for (const c of central) {
    out.set(c, pos);
    pos += c.length;
  }
  out.set(end, pos);
  return out;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Converte **negrito** em runs do Word. */
function runs(text: string): string {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts
    .map((part) => {
      const bold = /^\*\*[^*]+\*\*$/.test(part);
      const clean = bold ? part.slice(2, -2) : part;
      const rpr = bold ? "<w:rPr><w:b/></w:rPr>" : "";
      return `<w:r>${rpr}<w:t xml:space="preserve">${escapeXml(clean)}</w:t></w:r>`;
    })
    .join("");
}

function paragraph(
  text: string,
  style: string | undefined,
  p: FormatProfile,
  opts: {
    bullet?: boolean;
    indent?: boolean;
    align?: Align | undefined;
    pageBreakBefore?: boolean;
  } = {},
): string {
  const jc = opts.align ?? undefined;
  const ppr = [
    style ? `<w:pStyle w:val="${style}"/>` : "",
    opts.pageBreakBefore ? "<w:pageBreakBefore/>" : "",
    jc ? `<w:jc w:val="${jc === "center" ? "center" : jc === "right" ? "right" : "left"}"/>` : "",
    opts.indent && p.firstLineIndentMm
      ? `<w:ind w:firstLine="${mmToTwips(p.firstLineIndentMm)}"/>`
      : "",
    opts.bullet ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : "",
  ].join("");
  return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${runs(text)}</w:p>`;
}

/** Elemento pré-textual (capa/folha de rosto): folha inteira, texto centralizado. */
function frontMatterXml(block: Extract<Block, { type: "frontmatter" }>, p: FormatProfile): string {
  const line = (text: string, o: { bold?: boolean; center?: boolean } = {}) =>
    `<w:p><w:pPr>${o.center ? '<w:jc w:val="center"/>' : '<w:jc w:val="right"/>'}</w:pPr>${
      o.bold
        ? `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
        : runs(text)
    }</w:p>`;
  const spacer = '<w:p><w:pPr><w:jc w:val="center"/></w:pPr></w:p>';
  const out: string[] = [];
  if (block.kind === "cover") {
    out.push(line(block.author, { bold: true, center: true }));
    out.push(spacer, spacer, spacer);
    out.push(line(block.title, { bold: true, center: true }));
    out.push(spacer, spacer, spacer, spacer, spacer);
    out.push(line(block.place, { center: true }));
  } else {
    out.push(line(block.author, { bold: true, center: true }));
    out.push(spacer, spacer);
    out.push(line(block.title, { bold: true, center: true }));
    out.push(spacer, spacer);
    if (block.institution) out.push(line(block.institution, { center: true }));
    if (block.orcid) out.push(line(`ORCID: ${block.orcid}`, { center: true }));
    out.push(spacer);
    if (block.nature) out.push(line(block.nature, {}));
    out.push(spacer, spacer);
    out.push(line(block.place, { center: true }));
  }
  return out.join("");
}

function tableXml(rows: string[][]): string {
  const borders =
    "<w:tblBorders>" +
    ["top", "left", "bottom", "right", "insideH", "insideV"]
      .map((s) => `<w:${s} w:val="single" w:sz="4" w:color="999999"/>`)
      .join("") +
    "</w:tblBorders>";
  const body = rows
    .map((cells, i) => {
      const tr = cells
        .map((cell) => {
          const header = i === 0 ? "<w:rPr><w:b/></w:rPr>" : "";
          return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p><w:r>${header}<w:t xml:space="preserve">${escapeXml(cell)}</w:t></w:r></w:p></w:tc>`;
        })
        .join("");
      return `<w:tr>${tr}</w:tr>`;
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${borders}</w:tblPr>${body}</w:tbl>`;
}

function blockXml(block: Block, p: FormatProfile, inReferences: boolean): string {
  switch (block.type) {
    case "heading":
      return paragraph(
        p.headingUppercase ? block.text.toUpperCase() : block.text,
        `Heading${block.level}`,
        p,
        { align: block.align },
      );
    case "paragraph":
      return paragraph(block.text, inReferences ? "References" : undefined, p, {
        indent: !inReferences,
        align: block.align,
      });
    case "list":
      return block.items.map((it) => paragraph(it, undefined, p, { bullet: true })).join("");
    case "quote":
      return paragraph(block.text, "Quote", p);
    case "table":
      return tableXml(block.rows);
    case "rule":
      return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="888888"/></w:pBdr></w:pPr></w:p>';
    case "pagebreak":
      return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    case "frontmatter":
      return frontMatterXml(block, p);
  }
}

/** Um título inicia a seção de referências (onde vale espaço simples). */
function isReferencesHeading(block: Block): boolean {
  return block.type === "heading" && /^refer[êe]ncias?$/i.test(block.text.trim());
}

/**
 * Converte o Markdown aprovado em WordprocessingML, aplicando o perfil de
 * formatação escolhido (ABNT, APA, IEEE, …). Quando há elementos pré-textuais,
 * eles são inseridos como blocos no início do documento.
 */
export function markdownToDocumentXml(
  markdown: string,
  profile?: FormatProfile,
  frontMatter?: FrontMatter | null,
): string {
  const p = profile ?? formatProfile("abnt");
  const blocks = [
    ...(frontMatter ? frontMatterSequence(frontMatter) : []),
    ...parseBlocks(markdown),
  ];
  let inReferences = false;
  return blocks
    .map((block) => {
      if (isReferencesHeading(block)) inReferences = true;
      else if (block.type === "heading" && inReferences) inReferences = false;
      return blockXml(block, p, inReferences);
    })
    .join("");
}

export type DocxOptions = {
  title: string;
  author?: string;
  markdown: string;
  /** Norma de formatação (ABNT por padrão). */
  standard?: CitationStandard;
  /** Capa e folha de rosto (elementos pré-textuais ABNT), quando aplicável. */
  frontMatter?: FrontMatter | null;
};

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`;

/** Campo PAGE (número da página atual) do Word. */
const PAGE_FIELD = `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;

const EMPTY_HDR = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p/></w:hdr>`;

function headerXml(p: FormatProfile): string {
  if (p.pageNumber !== "top-right") return EMPTY_HDR;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr>${PAGE_FIELD}</w:p></w:hdr>`;
}

function footerXml(p: FormatProfile): string {
  if (p.pageNumber !== "bottom-center")
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p/></w:ftr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${PAGE_FIELD}</w:p></w:ftr>`;
}

function stylesXml(p: FormatProfile): string {
  const bodySz = ptToHalfPoints(p.fontSizePt);
  const refSz = ptToHalfPoints(p.references.fontSizePt);
  const line = lineToTwips(p.lineSpacing);
  const refLine = lineToTwips(p.references.lineSpacing);
  const jc = p.justify ? "both" : "left";
  const h1Sz = ptToHalfPoints(p.fontSizePt + 4);
  const h2Sz = ptToHalfPoints(p.fontSizePt + 2);
  const h3Sz = ptToHalfPoints(p.fontSizePt + 1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${p.fontFamily}" w:hAnsi="${p.fontFamily}" w:cs="${p.fontFamily}"/><w:sz w:val="${bodySz}"/><w:szCs w:val="${bodySz}"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="${ptToHalfPoints(p.spaceAfterPt)}" w:line="${line}" w:lineRule="auto"/><w:jc w:val="${jc}"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="${ptToHalfPoints(p.spaceAfterPt)}" w:line="${line}" w:lineRule="auto"/><w:jc w:val="${jc}"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/><w:jc w:val="left"/></w:pPr><w:rPr><w:b/><w:sz w:val="${h1Sz}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="200" w:after="100"/><w:jc w:val="left"/></w:pPr><w:rPr><w:b/><w:sz w:val="${h2Sz}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="160" w:after="80"/><w:jc w:val="left"/></w:pPr><w:rPr><w:b/><w:sz w:val="${h3Sz}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:pPr><w:ind w:left="${mmToTwips(p.longQuote.indentMm)}"/><w:spacing w:line="${lineToTwips(p.longQuote.lineSpacing)}" w:lineRule="auto" w:before="120" w:after="120"/><w:jc w:val="left"/></w:pPr><w:rPr><w:sz w:val="${ptToHalfPoints(p.longQuote.fontSizePt)}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="References"><w:name w:val="References"/><w:pPr><w:spacing w:after="0" w:line="${refLine}" w:lineRule="auto"/><w:jc w:val="left"/>${p.references.hangingIndentMm ? `<w:ind w:left="${mmToTwips(p.references.hangingIndentMm)}" w:hanging="${mmToTwips(p.references.hangingIndentMm)}"/>` : ""}</w:pPr><w:rPr><w:sz w:val="${refSz}"/></w:rPr></w:style>
<w:style w:type="numbering" w:styleId="ListBullet"/>
</w:styles>`;
}

function coreXml(title: string, author: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${escapeXml(title)}</dc:title>
<dc:creator>${escapeXml(author)}</dc:creator>
<cp:lastModifiedBy>${escapeXml(author)}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`;
}

/** Gera o .docx (bytes) a partir do Markdown aprovado, na norma escolhida. */
export function buildDocx(options: DocxOptions): Uint8Array {
  const encoder = new TextEncoder();
  const p = formatProfile(options.standard);
  const m = p.margins;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${markdownToDocumentXml(options.markdown, p, options.frontMatter)}
<w:sectPr><w:headerReference w:type="default" r:id="rId2" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><w:footerReference w:type="default" r:id="rId3" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${mmToTwips(m.topMm)}" w:right="${mmToTwips(m.rightMm)}" w:bottom="${mmToTwips(m.bottomMm)}" w:left="${mmToTwips(m.leftMm)}" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
</w:body></w:document>`;

  return zipStore([
    { name: "[Content_Types].xml", data: encoder.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: encoder.encode(RELS) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(DOC_RELS) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
    { name: "word/styles.xml", data: encoder.encode(stylesXml(p)) },
    { name: "word/header1.xml", data: encoder.encode(headerXml(p)) },
    { name: "word/footer1.xml", data: encoder.encode(footerXml(p)) },
    {
      name: "docProps/core.xml",
      data: encoder.encode(coreXml(options.title, options.author ?? "ScienceChat")),
    },
  ]);
}
