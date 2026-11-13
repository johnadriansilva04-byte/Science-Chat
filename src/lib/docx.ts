/**
 * Exportação DOCX (.docx) sem dependências externas: geramos o OOXML (um ZIP de
 * arquivos XML) diretamente em TypeScript, com método de armazenamento (sem
 * compressão), para rodar tanto no Worker quanto no navegador. O objetivo é
 * levar as páginas JÁ APROVADAS para o Word sem reescrever o texto com IA.
 */
import { parseBlocks, type Block } from "@/lib/article-blocks";

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

function paragraph(text: string, style?: string, opts: { bullet?: boolean } = {}): string {
  const ppr = [
    style ? `<w:pStyle w:val="${style}"/>` : "",
    opts.bullet ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : "",
  ].join("");
  return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${runs(text)}</w:p>`;
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

function blockXml(block: Block): string {
  switch (block.type) {
    case "heading":
      return paragraph(block.text, `Heading${block.level}`);
    case "paragraph":
      return paragraph(block.text);
    case "list":
      return block.items.map((it) => paragraph(it, undefined, { bullet: true })).join("");
    case "quote":
      return paragraph(block.text, "Quote");
    case "table":
      return tableXml(block.rows);
    case "rule":
      return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="888888"/></w:pBdr></w:pPr></w:p>';
  }
}

/** Converte o Markdown aprovado em Markdown de blocos → WordprocessingML. */
export function markdownToDocumentXml(markdown: string): string {
  const blocks = parseBlocks(markdown);
  return blocks.map(blockXml).join("");
}

export type DocxOptions = {
  title: string;
  author?: string;
  markdown: string;
};

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
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
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="24"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/><w:jc w:val="left"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="200" w:after="100"/><w:jc w:val="left"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="160" w:after="80"/><w:jc w:val="left"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:pPr><w:ind w:left="720"/><w:jc w:val="left"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>
<w:style w:type="numbering" w:styleId="ListBullet"/>
</w:styles>`;

function coreXml(title: string, author: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${escapeXml(title)}</dc:title>
<dc:creator>${escapeXml(author)}</dc:creator>
<cp:lastModifiedBy>${escapeXml(author)}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`;
}

/** Gera o .docx (bytes) a partir do Markdown aprovado. */
export function buildDocx(options: DocxOptions): Uint8Array {
  const encoder = new TextEncoder();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${markdownToDocumentXml(options.markdown)}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1247" w:bottom="1134" w:left="1247"/></w:sectPr>
</w:body></w:document>`;

  return zipStore([
    { name: "[Content_Types].xml", data: encoder.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: encoder.encode(RELS) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(DOC_RELS) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
    { name: "word/styles.xml", data: encoder.encode(STYLES) },
    {
      name: "docProps/core.xml",
      data: encoder.encode(coreXml(options.title, options.author ?? "ScienceChat")),
    },
  ]);
}
