/**
 * Preferências do dock do chat: o pesquisador pode redimensionar e expandir o
 * Pracinha, e essas escolhas sobrevivem à navegação. Guardamos apenas números
 * pequenos no localStorage — nada sensível. As funções puras aqui são testáveis
 * sem tocar no navegador.
 */
export type DockPrefs = {
  open: boolean;
  width: number;
  height: number;
};

export const DOCK_MIN_WIDTH = 300;
export const DOCK_MAX_WIDTH = 620;
export const DOCK_MIN_HEIGHT = 320;
export const DOCK_MAX_HEIGHT = 900;

export const DEFAULT_DOCK_PREFS: DockPrefs = { open: true, width: 360, height: 600 };

/** Mantém a largura/altura dentro dos limites utilizáveis. */
export function clampDockSize(width: number, height: number): { width: number; height: number } {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(Math.round(Number.isFinite(v) ? v : min), min), max);
  return {
    width: clamp(width, DOCK_MIN_WIDTH, DOCK_MAX_WIDTH),
    height: clamp(height, DOCK_MIN_HEIGHT, DOCK_MAX_HEIGHT),
  };
}

const STORAGE_KEY = "sciencechat.dock";

export function readDockPrefs(storage?: Pick<Storage, "getItem">): DockPrefs {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (!store) return DEFAULT_DOCK_PREFS;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DOCK_PREFS;
    const parsed = JSON.parse(raw) as Partial<DockPrefs>;
    const size = clampDockSize(
      parsed.width ?? DEFAULT_DOCK_PREFS.width,
      parsed.height ?? DEFAULT_DOCK_PREFS.height,
    );
    return { open: parsed.open ?? true, ...size };
  } catch {
    return DEFAULT_DOCK_PREFS;
  }
}

export function writeDockPrefs(prefs: DockPrefs, storage?: Pick<Storage, "setItem">): void {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (!store) return;
  try {
    const size = clampDockSize(prefs.width, prefs.height);
    store.setItem(STORAGE_KEY, JSON.stringify({ open: prefs.open, ...size }));
  } catch {
    // Sem persistência (modo privado, cota cheia): seguir sem gravar.
  }
}
