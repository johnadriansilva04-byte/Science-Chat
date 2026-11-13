/**
 * Helpers de fala (voz) sem dependência do DOM, para ficarem testáveis. O hook
 * `useVoice` usa estes utilitários para transformar texto em frases curtas e
 * escolher a melhor voz disponível.
 */

/** Limpa o markdown e divide o texto em frases curtas para a fala fluir. */
export function splitSentences(text: string, maxLen = 90): string[] {
  const clean = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[_*`#>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return [];

  // Cada frase vira um utterance curto (pausa natural); frases longas são
  // subdivididas por palavras para não travar a fala.
  const sentences = clean.match(/[^.!?…]+[.!?…]*/g) ?? [clean];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    let buffer = "";
    for (const word of sentence.trim().split(" ")) {
      const candidate = buffer ? `${buffer} ${word}` : word;
      if (candidate.length > maxLen && buffer) {
        chunks.push(buffer);
        buffer = word;
      } else {
        buffer = candidate;
      }
    }
    if (buffer.trim()) chunks.push(buffer.trim());
  }
  return chunks;
}

/** Escolhe a melhor voz para o idioma, preferindo vozes locais e "naturais". */
export function pickVoiceName(
  voices: { name: string; lang: string; localService?: boolean }[],
  lang: string,
): string | null {
  if (!voices.length) return null;
  const base = lang.split("-")[0]?.toLowerCase() ?? "pt";
  const exact = voices.filter((v) => v.lang.toLowerCase() === lang.toLowerCase());
  const same = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = exact.length ? exact : same;
  const preferred = pool.find((v) => v.localService && /natural|premium|enhanced/i.test(v.name));
  return (preferred ?? pool.find((v) => v.localService) ?? pool[0])?.name ?? null;
}
