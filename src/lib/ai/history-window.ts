/**
 * Janela de histórico enviada ao modelo.
 *
 * O prompt de sistema da entrevista tem ~19 mil caracteres (≈5.300 tokens) e é
 * reenviado a cada turno. Sem cortar o histórico, uma conversa de 40 mensagens
 * manda ~5.300 + tudo o que já foi dito — e a cota gratuita da Workers AI
 * (10.000 neurônios/dia) acaba em poucos turnos. O sintoma que o pesquisador vê
 * é "o Pracinha cansou" no meio do trabalho.
 *
 * A janela mantém as mensagens RECENTES (o que importa para o fio da conversa) e
 * sempre preserva a primeira mensagem do pesquisador, que costuma trazer o tema
 * e a tese — perdê-la faz o modelo esquecer sobre o que é o artigo.
 *
 * Função pura: recebe as mensagens já sanitizadas e devolve o recorte.
 */

/** Mensagens recentes mantidas, além da primeira do pesquisador. */
export const HISTORY_WINDOW = 24;

/**
 * Teto de caracteres do histórico. Medido em caracteres (não tokens) para não
 * depender de tokenizador: ~4 caracteres por token em português.
 */
export const HISTORY_MAX_CHARS = 24_000;

type HasRoleAndText = {
  role: string;
  parts?: { type: string; text?: string }[];
  content?: unknown;
};

function messageText(message: HasRoleAndText): string {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts.map((p) => (p.type === "text" ? (p.text ?? "") : "")).join("");
  }
  return "";
}

function totalChars(messages: HasRoleAndText[]): number {
  return messages.reduce((sum, m) => sum + messageText(m).length, 0);
}

/**
 * Recorta o histórico para caber na janela, preservando a primeira fala do
 * pesquisador. Devolve sempre uma lista não vazia quando a entrada não é vazia, e
 * a última mensagem (a que acabou de chegar) NUNCA é descartada.
 */
export function windowHistory<T extends HasRoleAndText>(
  messages: T[],
  windowSize: number = HISTORY_WINDOW,
  maxChars: number = HISTORY_MAX_CHARS,
): T[] {
  if (messages.length === 0) return messages;

  const firstUserIndex = messages.findIndex((m) => m.role === "user");
  const anchor = firstUserIndex >= 0 ? messages[firstUserIndex] : undefined;
  const anchorIndex = anchor ? firstUserIndex : -1;

  // Começa pelas mais recentes e vai incluindo para trás até estourar o limite.
  const kept: T[] = [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]!;
    if (i === anchorIndex) continue;
    const candidate = [message, ...kept];
    const withAnchor = anchor && i > anchorIndex ? [anchor, ...candidate] : candidate;
    if (candidate.length > windowSize) break;
    if (totalChars(withAnchor) > maxChars && kept.length > 0) break;
    kept.unshift(message);
  }

  // A mensagem mais recente precisa sobreviver mesmo se sozinha estourar o teto
  // (um anexo enorme, por exemplo): sem ela o modelo não recebe o pedido atual.
  if (kept.length === 0) kept.push(messages[messages.length - 1]!);

  if (anchor && kept[0] !== anchor) kept.unshift(anchor);
  return kept;
}
