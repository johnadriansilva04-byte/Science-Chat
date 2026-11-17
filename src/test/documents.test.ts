import { describe, expect, it } from "vitest";
import { deflateRawSync, deflateSync } from "node:zlib";
import { base64ToBytes, bytesToBase64 } from "@/lib/base64";
import {
  extractText,
  extractPdfImages,
  joinImageDescriptions,
  ascii85Decode,
  isImage,
  isPdf,
  mimeFromFilename,
  cleanImageDescription,
  detectUnsupportedPdfImages,
} from "@/lib/documents.server";
import { formatHits, type ResearchHit } from "@/lib/research.server";
import { insertAnexoMarker, anexoMarker } from "@/lib/anexo";
import { crc32 } from "@/lib/docx";

const enc = new TextEncoder();

/** Monta um ZIP com método deflate (8), como o Word grava os .docx. */
function deflateZip(entries: Record<string, string>): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const raw = enc.encode(content);
    const data = new Uint8Array(deflateRawSync(Buffer.from(raw)));
    const crc = crc32(raw);
    const nameBytes = enc.encode(name);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    parts.push(local, data);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    central.push(cd);
    offset += local.length + data.length;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, central.length, true);
  ev.setUint16(10, central.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  const all = [...parts, ...central, eocd];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of all) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

function deflatePdf(text: string): Uint8Array {
  const body = enc.encode(`BT /F1 12 Tf 72 720 Td (${text}) Tj ET`);
  const comp = new Uint8Array(deflateSync(Buffer.from(body)));
  const head = enc.encode(
    `%PDF-1.4\n1 0 obj<< /Length ${comp.length} /Filter /FlateDecode >>stream\n`,
  );
  const tail = enc.encode("\nendstream endobj\ntrailer<<>>\n%%EOF");
  return concat(head, comp, tail);
}

function plainPdf(text: string): Uint8Array {
  const body = enc.encode(`BT /F1 12 Tf 72 720 Td (${text}) Tj ET`);
  const head = enc.encode(`%PDF-1.4\n1 0 obj<< /Length ${body.length} >>stream\n`);
  const tail = enc.encode("\nendstream endobj\ntrailer<<>>\n%%EOF");
  return concat(head, body, tail);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let pos = 0;
  for (const a of arrays) {
    out.set(a, pos);
    pos += a.length;
  }
  return out;
}

describe("base64", () => {
  it("faz round-trip de bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 42]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });
});

describe("extractText", () => {
  it("lê texto puro", async () => {
    const b64 = bytesToBase64(new TextEncoder().encode("Olá mundo científico"));
    expect(await extractText("nota.txt", "text/plain", b64)).toBe("Olá mundo científico");
  });

  it("lê CSV pelo nome do arquivo", async () => {
    const b64 = bytesToBase64(new TextEncoder().encode("a,b\n1,2"));
    expect(await extractText("dados.csv", "", b64)).toBe("a,b\n1,2");
  });

  it("devolve null para binário sem texto legível", async () => {
    const b64 = bytesToBase64(new Uint8Array([1, 2, 3, 4]));
    expect(await extractText("foto.jpg", "image/jpeg", b64)).toBeNull();
  });

  it("descomprime DOCX (deflate) e junta os runs", async () => {
    const xml =
      '<?xml version="1.0"?><w:document><w:body><w:p><w:r><w:t>Resultado: X</w:t></w:r></w:p>' +
      "<w:p><w:r><w:t>aumenta Y.</w:t></w:r></w:p></w:body></w:document>";
    const b64 = bytesToBase64(deflateZip({ "word/document.xml": xml }));
    const out = await extractText("artigo.docx", "", b64);
    expect(out).toContain("Resultado: X");
    expect(out).toContain("aumenta Y.");
  });

  it("descomprime PDF com FlateDecode", async () => {
    const b64 = bytesToBase64(deflatePdf("Evidencia: n=120, p<0.05"));
    const out = await extractText("evidencia.pdf", "application/pdf", b64);
    expect(out).toContain("Evidencia: n=120, p<0.05");
  });

  it("lê PDF sem compressão", async () => {
    const b64 = bytesToBase64(plainPdf("Texto cru do PDF sem compressao"));
    expect(await extractText("cru.pdf", "", b64)).toContain("Texto cru do PDF sem compressao");
  });
});

describe("formatHits", () => {
  const hit: ResearchHit = {
    title: "Burocracia e violência institucional",
    authors: "Silva, J.; Souza, M.",
    year: 2021,
    venue: "Revista de Direito",
    doi: "10.1234/abc",
    url: "https://doi.org/10.1234/abc",
    source: "openalex",
  };

  it("lista resultados com metadados e DOI", () => {
    const out = formatHits([hit]);
    expect(out).toContain("1. Burocracia e violência institucional");
    expect(out).toContain("Silva, J.; Souza, M.");
    expect(out).toContain("2021");
    expect(out).toContain("DOI: 10.1234/abc");
  });

  it("informa quando nada foi encontrado", () => {
    expect(formatHits([])).toMatch(/Nenhum resultado/);
  });

  it("avisa quando a busca caiu no Crossref (degradada)", () => {
    const out = formatHits([hit], true);
    expect(out).toMatch(/AVISO/);
    expect(out).toMatch(/OpenAlex/);
    expect(out).toContain("1. Burocracia e violência institucional");
  });

  it("avisa que a busca falhou sem inventar referências", () => {
    expect(formatHits([], true)).toMatch(/NÃO invente referências/);
  });
});

describe("anexo markers", () => {
  it("monta o marcador simples e com legenda", () => {
    expect(anexoMarker(3)).toBe("[Anexo 3]");
    expect(anexoMarker(3, "Figura 1 — prova")).toBe("Figura 1 — prova [Anexo 3]");
  });

  it("insere após o parágrafo pedido", () => {
    const content = "Par 1.\n\nPar 2.\n\nPar 3.";
    const out = insertAnexoMarker(content, 2, "após o parágrafo 2");
    expect(out.split(/\n{2,}/)).toEqual(["Par 1.", "Par 2.", "[Anexo 2]", "Par 3."]);
  });

  it("acrescenta ao final quando não há posição", () => {
    const out = insertAnexoMarker("Par 1.", 5);
    expect(out.endsWith("[Anexo 5]")).toBe(true);
  });

  it("acrescenta ao final quando só há um parágrafo", () => {
    const out = insertAnexoMarker("Único.", 1, "após o parágrafo 3");
    expect(out).toBe("Único.\n\n[Anexo 1]");
  });
});

describe("imagens (visão)", () => {
  it("reconhece imagem por MIME ou extensão", () => {
    expect(isImage("image/png", "foto")).toBe(true);
    expect(isImage("", "grafico.jpg")).toBe(true);
    expect(isImage("application/octet-stream", "scan.HEIC")).toBe(true);
    expect(isImage("application/pdf", "doc.pdf")).toBe(false);
    expect(isImage("text/plain", "nota.txt")).toBe(false);
  });

  it("infere o MIME pela extensão", () => {
    expect(mimeFromFilename("foto.JPG")).toBe("image/jpeg");
    expect(mimeFromFilename("grafico.webp")).toBe("image/webp");
    expect(mimeFromFilename("documento.docx")).toBeNull();
  });

  it("normaliza a descrição devolvida pelo modelo de visão", () => {
    expect(cleanImageDescription("  Gráfico de barras com valores 3, 5 e 8.  ")).toBe(
      "Gráfico de barras com valores 3, 5 e 8.",
    );
    expect(cleanImageDescription("   ")).toBeNull();
  });
});

/** PDF sintético com uma imagem embutida (escolhe o filtro). */
function pdfWithImage(image: Uint8Array, filter: "DCTDecode" | "FlateDecode"): Uint8Array {
  const dict = `<< /Type /XObject /Subtype /Image /Width 100 /Height 100 /Filter /${filter} >>`;
  const head = new TextEncoder().encode(`%PDF-1.4\n1 0 obj\n${dict}\nstream\n`);
  const tail = new TextEncoder().encode(`\nendstream\nendobj\n%%EOF`);
  const body = filter === "DCTDecode" ? image : new Uint8Array(deflateSync(Buffer.from(image)));
  const out = new Uint8Array(head.length + body.length + tail.length);
  out.set(head, 0);
  out.set(body, head.length);
  out.set(tail, head.length + body.length);
  return out;
}

/** Bytes pseudoaleatórios incompressíveis (para o PDF de teste passar do tamanho mínimo). */
function noisyBytes(size: number): Uint8Array {
  const out = new Uint8Array(size);
  let x = 123456789;
  for (let i = 0; i < size; i += 1) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out[i] = x & 0xff;
  }
  return out;
}

/** PDF com a página embutida como PIXELS CRUS comprimidos (sem cabeçalho de imagem). */
function pdfWithRawImage(
  raw: Uint8Array,
  width: number,
  height: number,
  colorSpace: "DeviceRGB" | "DeviceGray",
): Uint8Array {
  const dict = `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /${colorSpace} /BitsPerComponent 8 /Filter /FlateDecode >>`;
  const head = new TextEncoder().encode(`%PDF-1.4\n1 0 obj\n${dict}\nstream\n`);
  const tail = new TextEncoder().encode(`\nendstream\nendobj\n%%EOF`);
  const body = new Uint8Array(deflateSync(Buffer.from(raw)));
  const out = new Uint8Array(head.length + body.length + tail.length);
  out.set(head, 0);
  out.set(body, head.length);
  out.set(tail, head.length + body.length);
  return out;
}

// JPEG mínimo válido o suficiente para o sniff (FF D8 FF ...). Preenchido para
// passar do limite de tamanho mínimo (minBytes).
function fakeJpeg(size = 6000): Uint8Array {
  const b = new Uint8Array(size);
  b[0] = 0xff;
  b[1] = 0xd8;
  b[2] = 0xff;
  b[size - 2] = 0xff;
  b[size - 1] = 0xd9;
  return b;
}

function fakePng(size = 6000): Uint8Array {
  const b = new Uint8Array(size);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return b;
}

/** Codifica em ASCII85 (para montar PDFs de teste como o ReportLab faz). */
function ascii85Encode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 4) {
    const chunk = bytes.subarray(i, i + 4);
    let value = 0;
    for (let j = 0; j < 4; j += 1) value = value * 256 + (chunk[j] ?? 0);
    const n = chunk.length;
    const digits: number[] = [];
    for (let j = 0; j < 5; j += 1) {
      digits.unshift(value % 85);
      value = Math.floor(value / 85);
    }
    out += String.fromCharCode(...digits.map((d) => d + 33).slice(0, n + 1));
  }
  return `${out}~>`;
}

/** PDF com imagem JPEG codificada em ASCII85 (padrão do ReportLab). */
function pdfWithAscii85Jpeg(image: Uint8Array): Uint8Array {
  const dict = `<< /Type /XObject /Subtype /Image /Width 100 /Height 100 /Filter [ /ASCII85Decode /DCTDecode ] >>`;
  const head = new TextEncoder().encode(`%PDF-1.4\n1 0 obj\n${dict}\nstream\n`);
  const body = new TextEncoder().encode(ascii85Encode(image));
  const tail = new TextEncoder().encode(`\nendstream\nendobj\n%%EOF`);
  const out = new Uint8Array(head.length + body.length + tail.length);
  out.set(head, 0);
  out.set(body, head.length);
  out.set(tail, head.length + body.length);
  return out;
}

describe("ASCII85 (PDFs do ReportLab/scanners)", () => {
  it("decodifica um vetor conhecido", () => {
    const original = new TextEncoder().encode("Man is distinguished");
    const decoded = ascii85Decode(new TextEncoder().encode(ascii85Encode(original)));
    expect(new TextDecoder().decode(decoded)).toBe("Man is distinguished");
  });

  it("extrai JPEG embutido com /ASCII85Decode + /DCTDecode", async () => {
    const jpeg = fakeJpeg(7000);
    const imgs = await extractPdfImages(pdfWithAscii85Jpeg(jpeg));
    expect(imgs).toHaveLength(1);
    expect(imgs[0]!.mime).toBe("image/jpeg");
    expect(imgs[0]!.bytes.length).toBe(jpeg.length);
  });
});

describe("OCR de PDF digitalizado (extração de imagens)", () => {
  it("extrai imagem JPEG embutida com /DCTDecode", async () => {
    const pdf = pdfWithImage(fakeJpeg(), "DCTDecode");
    const imgs = await extractPdfImages(pdf);
    expect(imgs).toHaveLength(1);
    expect(imgs[0]!.mime).toBe("image/jpeg");
    expect(imgs[0]!.bytes.length).toBeGreaterThan(1000);
  });

  it("extrai imagem PNG comprimida com /FlateDecode", async () => {
    const pdf = pdfWithImage(fakePng(), "FlateDecode");
    const imgs = await extractPdfImages(pdf);
    expect(imgs).toHaveLength(1);
    expect(imgs[0]!.mime).toBe("image/png");
  });

  it("reempacota pixels crus (FlateDecode sem cabeçalho) num PNG válido", async () => {
    // Scanner/ReportLab às vezes embute a página como RGB cru comprimido, sem
    // cabeçalho PNG/JPEG. Antes isso era descartado e o OCR não acontecia.
    const w = 400;
    const h = 300;
    const raw = noisyBytes(w * h * 3);
    const pdf = pdfWithRawImage(raw, w, h, "DeviceRGB");
    const imgs = await extractPdfImages(pdf);
    expect(imgs).toHaveLength(1);
    expect(imgs[0]!.mime).toBe("image/png");
    // Assinatura PNG e dimensões no IHDR.
    const png = imgs[0]!.bytes;
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const dv = new DataView(png.buffer, png.byteOffset);
    expect(dv.getUint32(16)).toBe(w);
    expect(dv.getUint32(20)).toBe(h);
  });

  it("reempacota pixels crus em tons de cinza", async () => {
    const w = 500;
    const h = 400;
    const raw = noisyBytes(w * h);
    const pdf = pdfWithRawImage(raw, w, h, "DeviceGray");
    const imgs = await extractPdfImages(pdf);
    expect(imgs).toHaveLength(1);
    const dv = new DataView(imgs[0]!.bytes.buffer, imgs[0]!.bytes.byteOffset);
    expect(dv.getUint32(16)).toBe(w);
    expect(dv.getUint32(20)).toBe(h);
    expect(imgs[0]!.bytes[25]).toBe(0); // colorType 0 = grayscale no IHDR
  });

  it("ignora imagens pequenas demais (logos/ícones)", async () => {
    const pdf = pdfWithImage(fakeJpeg(200), "DCTDecode");
    expect(await extractPdfImages(pdf)).toHaveLength(0);
  });

  it("devolve vazio quando o PDF não tem imagem", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<< >>\nendobj\n%%EOF");
    expect(await extractPdfImages(pdf)).toHaveLength(0);
  });

  it("identifica PDF por mime ou extensão", () => {
    expect(isPdf("application/pdf", "doc")).toBe(true);
    expect(isPdf("", "scan.PDF")).toBe(true);
    expect(isPdf("text/plain", "nota.txt")).toBe(false);
  });
});

describe("detectUnsupportedPdfImages", () => {
  const pdfWithDict = (dict: string) =>
    new TextEncoder().encode(`%PDF-1.4\n1 0 obj\n${dict}\nstream\nx\nendstream\nendobj\n%%EOF`);

  it("aponta fax CCITT quando a imagem usa /CCITTFaxDecode", () => {
    const pdf = pdfWithDict("<< /Type /XObject /Subtype /Image /Filter /CCITTFaxDecode >>");
    expect(detectUnsupportedPdfImages(pdf)).toBe("fax (CCITT)");
  });

  it("aponta JPEG 2000 quando usa /JPXDecode", () => {
    const pdf = pdfWithDict("<< /Type /XObject /Subtype /Image /Filter /JPXDecode >>");
    expect(detectUnsupportedPdfImages(pdf)).toBe("JPEG 2000");
  });

  it("devolve null para imagem JPEG comum (/DCTDecode)", () => {
    const pdf = pdfWithDict("<< /Type /XObject /Subtype /Image /Filter /DCTDecode >>");
    expect(detectUnsupportedPdfImages(pdf)).toBeNull();
  });

  it("devolve null quando o PDF não tem imagem", () => {
    expect(detectUnsupportedPdfImages(new TextEncoder().encode("%PDF-1.4\n%%EOF"))).toBeNull();
  });
});

describe("joinImageDescriptions", () => {
  it("devolve o texto único sem cabeçalho quando há uma só parte", () => {
    expect(joinImageDescriptions([{ label: "p1", text: "  Olá mundo  " }])).toBe("Olá mundo");
  });

  it("numera as partes quando há várias", () => {
    const out = joinImageDescriptions([
      { label: "digitalização 1", text: "Página A" },
      { label: "digitalização 2", text: "Página B" },
    ]);
    expect(out).toContain("[digitalização 1]\nPágina A");
    expect(out).toContain("[digitalização 2]\nPágina B");
  });

  it("ignora partes vazias e devolve null quando nada sobra", () => {
    expect(joinImageDescriptions([{ label: "p1", text: "   " }])).toBeNull();
  });
});
