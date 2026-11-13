import { base64ToBytes } from "@/lib/base64";

/**
 * Extrai texto de um documento primário. Cobre texto puro, CSV e Markdown. Para
 * PDF/DOCX, extrai o texto "cru" disponível (heurística leve) — o suficiente para
 * dar contexto à IA; se nada legível for encontrado, devolve null.
 */
export function extractText(filename: string, mime: string, base64: string): string | null {
  const lower = filename.toLowerCase();
  try {
    if (mime.startsWith("text/") || /\.(txt|csv|md|markdown|json|xml|html?)$/.test(lower)) {
      const text = new TextDecoder().decode(base64ToBytes(base64));
      return text.slice(0, 20_000);
    }
    if (mime === "application/pdf" || lower.endsWith(".pdf")) {
      return extractPdfText(base64);
    }
    if (lower.endsWith(".docx")) {
      return extractDocxText(base64);
    }
  } catch {
    return null;
  }
  return null;
}

/** Junta os fragmentos de texto entre parênteses de um PDF não comprimido. */
function extractPdfText(base64: string): string | null {
  const raw = latin1(base64ToBytes(base64));
  const chunks: string[] = [];
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj|\[((?:[^\][]|\\.)*)\]\s*TJ/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const group = m[1] ?? m[2] ?? "";
    const text = group
      .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\([()\\])/g, "$1");
    if (text.trim()) chunks.push(text);
  }
  const out = chunks.join(" ").replace(/\s+/g, " ").trim();
  return out.length > 20 ? out.slice(0, 20_000) : null;
}

/** DOCX é um ZIP; sem inflate completo, extraímos o XML legível disponível. */
function extractDocxText(base64: string): string | null {
  const raw = latin1(base64ToBytes(base64));
  const matches = raw.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (!matches) return null;
  const out = matches
    .map((tag) => tag.replace(/<[^>]+>/g, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return out.length > 10 ? out.slice(0, 20_000) : null;
}

function latin1(bytes: Uint8Array): string {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}
