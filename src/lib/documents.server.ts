import { base64ToBytes, bytesToBase64 } from "@/lib/base64";

const MAX_TEXT = 20_000;

const IMAGE_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  heic: "image/heic",
  tif: "image/tiff",
  tiff: "image/tiff",
};

/** MIME da imagem a partir da extensão (quando o navegador não informa). */
export function mimeFromFilename(filename: string): string | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return IMAGE_EXT[ext] ?? null;
}

/** True quando o anexo é uma imagem (foto, gráfico, captura, exame digitalizado). */
export function isImage(mime: string, filename: string): boolean {
  if (mime.startsWith("image/")) return true;
  return mimeFromFilename(filename) !== null;
}

/** True quando o anexo é um PDF (pode ser texto ou digitalização). */
export function isPdf(mime: string, filename: string): boolean {
  return mime === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
}

/**
 * Instrução de visão: o modelo descreve a imagem e transcreve o texto visível,
 * para o Pracinha "ler" fotos, gráficos e digitalizações como lê um texto.
 */
export const IMAGE_DESCRIPTION_PROMPT = [
  "Você é um assistente científico. Analise a imagem anexada a um artigo.",
  "Descreva em português, de forma objetiva, o que ela mostra (tipo de imagem, elementos, dados, eixos de gráfico, valores legíveis).",
  "Transcreva TODO o texto visível (rótulos, legendas, números, equações) exatamente como aparece.",
  "Se for um gráfico ou tabela, resuma os dados principais. Se for um documento digitalizado, transcreva o conteúdo.",
  "Não invente informação que não esteja na imagem. Se não for possível ler algo, diga que está ilegível.",
].join(" ");

/** Normaliza a descrição devolvida pelo modelo de visão. */
export function cleanImageDescription(text: string): string | null {
  const out = text.trim();
  return out.length > 0 ? out.slice(0, MAX_TEXT) : null;
}

/**
 * Instrução de OCR para PDF digitalizado (página que é só uma foto): pede a
 * transcrição fiel do documento, priorizando o texto sobre a descrição.
 */
export const PDF_OCR_PROMPT = [
  "Esta imagem é uma página digitalizada de um documento (PDF escaneado).",
  "Transcreva em português TODO o texto visível, na ordem de leitura, mantendo títulos, listas, tabelas e números.",
  "Se houver figuras, tabelas ou gráficos, descreva brevemente e informe os dados legíveis.",
  "Se alguma parte estiver ilegível, escreva [ilegível]. Não invente conteúdo que não esteja na página.",
].join(" ");

/** Assinaturas (magic bytes) das imagens que a Workers AI consegue ler. */
function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export type PdfImage = { mime: string; bytes: Uint8Array };

/**
 * Extrai as imagens embutidas num PDF (fotos, digitalizações). Cobre os dois
 * casos comuns em PDFs escaneados:
 *  - imagens com filtro `/DCTDecode` (JPEG) — o stream JÁ é um JPEG;
 *  - imagens com filtro `/FlateDecode` (PNG/zlib) — descomprime e valida o PNG.
 * Devolve no máximo `max` imagens, das maiores para as menores (as páginas
 * escaneadas costumam dominar; logos e ícones ficam de fora).
 */
export async function extractPdfImages(
  bytes: Uint8Array,
  max = 3,
  minBytes = 4096,
): Promise<PdfImage[]> {
  const raw = latin1(bytes);
  const out: PdfImage[] = [];
  const re = /stream\r?\n?([\s\S]*?)\r?\n?endstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const dictStart = raw.lastIndexOf("<<", m.index);
    const dict = dictStart >= 0 ? raw.slice(dictStart, m.index) : "";
    if (!/\/Subtype\s*\/Image/.test(dict)) continue;
    const body = latin1ToBytes(m[1] ?? "");
    let img: PdfImage | null = null;
    if (/\/DCTDecode/.test(dict)) {
      const mime = sniffImageMime(body);
      if (mime) img = { mime, bytes: body };
    } else if (/\/FlateDecode/.test(dict)) {
      const data = await inflate(body, "deflate");
      if (data) {
        const mime = sniffImageMime(data);
        if (mime) img = { mime, bytes: data };
      }
    }
    if (img && img.bytes.length >= minBytes) out.push(img);
  }
  out.sort((a, b) => b.bytes.length - a.bytes.length);
  return out.slice(0, max);
}

/**
 * Junta as descrições de várias páginas/imagens num só texto, com cabeçalho por
 * página. Função pura para poder ser testada sem IA.
 */
export function joinImageDescriptions(parts: { label: string; text: string }[]): string | null {
  const clean = parts
    .map((p) => ({ label: p.label, text: p.text.trim() }))
    .filter((p) => p.text.length > 0);
  if (!clean.length) return null;
  const out =
    clean.length === 1 ? clean[0]!.text : clean.map((p) => `[${p.label}]\n${p.text}`).join("\n\n");
  return out.slice(0, MAX_TEXT);
}

/**
 * OCR de PDF digitalizado: extrai as imagens do PDF e passa cada uma pelo modelo
 * de visão, juntando as descrições. Devolve null quando não há imagem legível ou
 * quando a IA está indisponível (o chamador decide o que fazer).
 */
export async function describePdfImages(bytes: Uint8Array, prompt: string): Promise<string | null> {
  const images = await extractPdfImages(bytes);
  if (!images.length) return null;
  const { describeImage } = await import("@/lib/ai/gateway.server");
  const parts: { label: string; text: string }[] = [];
  for (let i = 0; i < images.length; i += 1) {
    const img = images[i]!;
    const text = await describeImage(bytesToBase64(img.bytes), img.mime, prompt, 1200);
    parts.push({ label: `digitalização ${i + 1}`, text });
  }
  return joinImageDescriptions(parts);
}

/**
 * Extrai texto de um documento primário. Cobre texto puro, CSV e Markdown, e
 * descomprime de verdade os formatos binários: DOCX (ZIP com XML) e PDF
 * (`/FlateDecode`). É assíncrono porque a descompressão usa `DecompressionStream`
 * (deflate raw para o ZIP, zlib para o PDF). Se nada legível for encontrado,
 * devolve null.
 */
export async function extractText(
  filename: string,
  mime: string,
  base64: string,
): Promise<string | null> {
  const lower = filename.toLowerCase();
  try {
    if (mime.startsWith("text/") || /\.(txt|csv|md|markdown|json|xml|html?)$/.test(lower)) {
      return new TextDecoder().decode(base64ToBytes(base64)).slice(0, MAX_TEXT);
    }
    if (mime === "application/pdf" || lower.endsWith(".pdf")) {
      return await extractPdfText(base64ToBytes(base64));
    }
    if (lower.endsWith(".docx")) {
      return await extractDocxText(base64ToBytes(base64));
    }
  } catch {
    return null;
  }
  return null;
}

/** Texto de um arquivo PDF: tenta os streams comprimidos e cai no cru se preciso. */
async function extractPdfText(bytes: Uint8Array): Promise<string | null> {
  const raw = latin1(bytes);
  const chunks: string[] = [];
  const streamRe = /stream\r?\n?([\s\S]*?)\r?\n?endstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw)) !== null) {
    const dictStart = raw.lastIndexOf("<<", m.index);
    const dict = dictStart >= 0 ? raw.slice(dictStart, m.index) : "";
    const body = latin1ToBytes(m[1] ?? "");
    let content: Uint8Array | null = null;
    if (dict.includes("FlateDecode")) content = await inflate(body, "deflate");
    if (!content && /\(|Tj|TJ/.test(m[1] ?? "")) content = body;
    if (content) chunks.push(collectPdfOperators(latin1(content)));
  }
  // PDFs sem streams comprimidos: o texto fica entre parênteses no corpo cru.
  if (!chunks.length) chunks.push(collectPdfOperators(raw));
  const out = chunks.join(" ").replace(/\s+/g, " ").trim();
  return out.length > 20 ? out.slice(0, MAX_TEXT) : null;
}

/** Extrai o texto dos operadores `Tj`/`TJ` de um content stream de PDF. */
function collectPdfOperators(content: string): string {
  const chunks: string[] = [];
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj|\[((?:[^\][]|\\.)*)\]\s*TJ/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const group = m[1] ?? m[2] ?? "";
    const text = group
      .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\([()\\])/g, "$1");
    if (text.trim()) chunks.push(text);
  }
  return chunks.join(" ");
}

/** DOCX é um ZIP: descomprime os XML de `word/` e junta os runs `<w:t>`. */
async function extractDocxText(bytes: Uint8Array): Promise<string | null> {
  const entries = unzipEntries(bytes);
  if (!entries.length) return null;
  const xmlParts: string[] = [];
  for (const entry of entries) {
    if (!/^word\/.*\.xml$/.test(entry.name)) continue;
    const data = entry.method === 0 ? entry.data : await inflate(entry.data, "deflate-raw");
    if (data) xmlParts.push(latin1(data));
  }
  const xml = xmlParts.join("\n");
  const paragraphs = xml.split(/<\/w:p>/).map((p) => {
    const runs = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (!runs) return "";
    return runs.map((tag) => tag.replace(/<[^>]+>/g, "")).join("");
  });
  const out = paragraphs
    .filter((p) => p.trim())
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  return out.length > 10 ? out.slice(0, MAX_TEXT) : null;
}

type ZipEntry = { name: string; method: number; data: Uint8Array };

/** Lê as entradas de um arquivo ZIP a partir do diretório central. */
function unzipEntries(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Localiza o End Of Central Directory (assinatura 0x06054b50), varrendo do fim.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 0xffff; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return [];
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count && offset + 46 <= bytes.length; n += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = latin1(bytes.subarray(offset + 46, offset + 46 + nameLen));
    if (compSize > 0 && view.getUint32(localOffset, true) === 0x04034b50) {
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      entries.push({ name, method, data: bytes.subarray(dataStart, dataStart + compSize) });
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Descomprime `data` com o algoritmo dado; null se o runtime não suportar. */
async function inflate(
  data: Uint8Array,
  format: "deflate" | "deflate-raw",
): Promise<Uint8Array | null> {
  try {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    });
    const reader = source
      .pipeThrough(
        new DecompressionStream(format) as unknown as ReadableWritablePair<Uint8Array, Uint8Array>,
      )
      .getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  } catch {
    return null;
  }
}

function latin1(bytes: Uint8Array): string {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

function latin1ToBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}
