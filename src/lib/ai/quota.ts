/**
 * A conta gratuita da Workers AI tem cota diária de neurônios. Quando esgota, a
 * API responde com erro 4006 ("daily free allocation of 10,000 neurons") e o
 * stream vem vazio. Aqui detectamos esse caso e calculamos quando a cota volta,
 * para o Pracinha "descansar" e retomar sozinho.
 */

/** Marcador enviado no stream quando a cota esgota (o cliente troca por um aviso amigável). */
export const QUOTA_MARKER = "PRACINHA_QUOTA_EXHAUSTED";

const QUOTA_PATTERNS = [
  /neurons?/i,
  /daily free allocation/i,
  /free allocation/i,
  /\b4006\b/,
  /quota/i,
  /rate limit/i,
  /no output generated/i,
];

/** True quando a mensagem de erro indica cota/limite da IA esgotado. */
export function isQuotaError(message: string | undefined | null): boolean {
  if (!message) return false;
  return QUOTA_PATTERNS.some((p) => p.test(message));
}

/** Próxima meia-noite UTC — quando a cota gratuita da Workers AI é renovada. */
export function nextQuotaReset(now: number = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0);
}

/** Formata a hora (HH:MM) em que a IA volta a funcionar. */
export function formatResetTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Texto de contagem regressiva até a volta da IA. */
export function countdownLabel(resetAt: number, now: number = Date.now()): string {
  const ms = resetAt - now;
  if (ms <= 0) return "já voltou";
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
}
