import { describe, expect, it } from "vitest";
import { deflateRawSync, deflateSync } from "node:zlib";
import { base64ToBytes, bytesToBase64 } from "@/lib/base64";
import {
  extractText,
  isImage,
  mimeFromFilename,
  cleanImageDescription,
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
