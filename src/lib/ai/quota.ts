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

/**
 * Formata a hora (HH:MM, 24h) em que a IA volta a funcionar.
 *
 * Locale fixo em pt-BR: com `[]` o formato vem do navegador, e num sistema em
 * inglês a tela mostrava "12:00 AM" no meio de um app em português. Também
 * fixamos `hour12: false` — "meia-noite UTC" precisa aparecer como 21:00/00:00,
 * nunca como "12:00 AM".
 */
export function formatResetTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  });
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

/**
 * O que um turno do Pracinha diz sobre o descanso da IA.
 *
 * O aviso de cota chega como texto no stream. Ele precisa ligar E desligar o
 * descanso: sem o desligamento, o card "cansou" ficava na tela contradizendo a
 * resposta que acabara de chegar. Turno vazio não decide nada (é stream em
 * andamento).
 */
export function turnRestState(text: string | undefined | null): "exhausted" | "ok" | "ignore" {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return "ignore";
  return trimmed.includes(QUOTA_MARKER) ? "exhausted" : "ok";
}

/**
 * Espera legível a partir do corpo de um 429 (`{ retryAfterSec }`), ou null.
 *
 * O corpo do erro chega como texto JSON; se ele não for o nosso formato, a
 * mensagem cai no aviso genérico em vez de mostrar número errado.
 */
export function retryAfterFromBody(body: string | undefined | null): string | null {
  if (!body) return null;
  const match = /"retryAfterSec"\s*:\s*(\d+)/.exec(body);
  if (!match) return null;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds >= 60 ? `${Math.ceil(seconds / 60)} min` : `${seconds} s`;
}
