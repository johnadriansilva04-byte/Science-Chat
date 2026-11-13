/**
 * Ponte Museu → Pracinha. Quando o pesquisador vê uma obra no museu e quer usá-la
 * no artigo, ela é guardada aqui (no navegador). Ao voltar ao artigo, o chat
 * oferece enviá-la de uma vez — sem o usuário ter de redigitar nada.
 */
export type InboxWork = {
  title: string;
  authors: string;
  year: number | null;
  venue: string;
  doi: string | null;
};

const KEY = "sc:pracinha-inbox";

function available(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readInbox(): InboxWork[] {
  if (!available()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InboxWork[]) : [];
  } catch {
    return [];
  }
}

/** Guarda uma obra, evitando repetir a mesma (por DOI ou título). */
export function addToInbox(work: InboxWork): number {
  if (!available()) return 0;
  const current = readInbox();
  const key = (w: InboxWork) => w.doi ?? w.title.toLowerCase();
  if (!current.some((w) => key(w) === key(work))) current.push(work);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* armazenamento indisponível: segue sem persistir */
  }
  return current.length;
}

export function clearInbox(): void {
  if (!available()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Texto curto e citável para enviar ao Pracinha no chat. */
export function inboxToMessage(works: InboxWork[]): string {
  const lines = works.map((w) => {
    const meta = [w.authors, w.year ? String(w.year) : "", w.venue].filter(Boolean).join(" · ");
    const doi = w.doi ? ` — DOI: ${w.doi}` : "";
    return `- ${w.title}${meta ? ` (${meta})` : ""}${doi}`;
  });
  return [
    "Trouxe estas obras do Museu para o meu artigo. Use como referência real (com DOI):",
    ...lines,
  ].join("\n");
}
