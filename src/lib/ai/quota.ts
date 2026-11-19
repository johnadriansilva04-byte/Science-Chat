/**
 * A conta gratuita da Workers AI tem cota diária de neurônios. Quando esgota, a
 * API responde com erro 4006 ("daily free allocation of 10,000 neurons") e o
 * stream vem vazio. Aqui detectamos esse caso e calculamos quando a cota volta,
 * para o Pracinha "descansar" e retomar sozinho.
 */

/** Marcador enviado no stream quando a cota esgota (o cliente troca por um aviso amigável). */
export const QUOTA_MARKER = "PRACINHA_QUOTA_EXHAUSTED";

// Só a EXAUSTÃO da cota diária (erro 4006) trava o chat até a meia-noite UTC.
// Um 429/"rate limit" transitório NÃO é cota diária: tratá-lo como tal prendia o
// pesquisador até a virada do dia por um limite que se resolve em segundos.
//
// Cada padrão exige a marca da COTA DIÁRIA. Frases genéricas ("no output
// generated", "quota exceeded") aparecem em falhas passageiras do stream e, ao
// casarem aqui, travavam o chat por um dia inteiro sem motivo.
const QUOTA_PATTERNS = [
  /daily free allocation/i,
  /\b10,?000 neurons\b/i,
  /neurons? (?:per|a) day/i,
  /\b4006\b/,
  /daily (?:[\w-]+ ){0,3}(?:exhausted|exceeded|reached|used up)/i,
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

/**
 * Mensagem amigável para exibir quando uma geração (plano/página) falha por cota
 * esgotada, em vez do erro cru da API. Devolve null quando não é caso de cota.
 */
export function quotaRestMessage(message: string | undefined | null): string | null {
  if (!isQuotaError(message)) return null;
  return `O Pracinha cansou 😴 — os neurônios do dia acabaram. Ele volta às ${formatResetTime(
    nextQuotaReset(),
  )}.`;
}
