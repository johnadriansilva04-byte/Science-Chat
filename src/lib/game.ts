/**
 * Configuração do joguinho do ScienceChat.
 *
 * O jogo em si vive em OUTRO projeto: aqui só existe o card que o anuncia e o
 * encaixe (`GAME_EMBED_URL`) onde ele é acoplado. Enquanto a URL não estiver
 * configurada, o card continua visível e mostra o que o jogo é — assim o
 * encaixe pode ser ligado depois sem mexer em nenhuma tela.
 *
 * Regra: nada de jogo dentro do fluxo de produção do artigo. Ele aparece só em
 * momentos de espera (cota da IA esgotada, página não encontrada).
 */

export const GAME_NAME = "Stop científico";

export const GAME_TAGLINE =
  "O Stop de sempre, com categorias de ciência. Serve para descansar a cabeça entre uma página e outra.";

/** Categorias do Stop. Curtas de propósito: cabem na largura de um celular. */
export const STOP_CATEGORIES = [
  "Cientista",
  "Elemento químico",
  "Revista científica",
  "Método",
  "País",
  "Objeto de laboratório",
] as const;

/**
 * Valida a URL de encaixe do jogo.
 *
 * Só `https:` passa: o card renderiza o jogo num iframe, e um `http:` numa
 * página `https` é bloqueado como conteúdo misto — além de abrir conteúdo não
 * criptografado por causa de um valor errado de ambiente.
 */
export function resolveGameUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** URL do jogo vinda do ambiente de build (`VITE_GAME_URL`), já validada. */
export function gameEmbedUrl(): string | null {
  return resolveGameUrl(import.meta.env["VITE_GAME_URL"]);
}
