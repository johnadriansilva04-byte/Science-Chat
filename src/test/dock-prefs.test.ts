import { describe, expect, it } from "vitest";
import {
  DOCK_MAX_HEIGHT,
  DOCK_MAX_WIDTH,
  DOCK_MIN_HEIGHT,
  DOCK_MIN_WIDTH,
  clampDockSize,
  readDockPrefs,
  writeDockPrefs,
} from "@/lib/dock-prefs";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    raw: data,
  };
}

describe("clampDockSize", () => {
  it("mantém valores dentro dos limites", () => {
    expect(clampDockSize(400, 500)).toEqual({ width: 400, height: 500 });
  });

  it("limita abaixo do mínimo e acima do máximo", () => {
    expect(clampDockSize(10, 10)).toEqual({ width: DOCK_MIN_WIDTH, height: DOCK_MIN_HEIGHT });
    expect(clampDockSize(9999, 9999)).toEqual({
      width: DOCK_MAX_WIDTH,
      height: DOCK_MAX_HEIGHT,
    });
  });

  it("trata valores não finitos caindo no mínimo", () => {
    expect(clampDockSize(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({
      width: DOCK_MIN_WIDTH,
      height: DOCK_MIN_HEIGHT,
    });
  });
});

describe("readDockPrefs / writeDockPrefs", () => {
  it("devolve o padrão quando não há nada salvo", () => {
    expect(readDockPrefs(fakeStorage())).toEqual({ open: true, width: 360, height: 600 });
  });

  it("faz round-trip do tamanho e do estado", () => {
    const store = fakeStorage();
    writeDockPrefs({ open: false, width: 480, height: 700 }, store);
    expect(readDockPrefs(store)).toEqual({ open: false, width: 480, height: 700 });
  });

  it("sanea valores corrompidos ou fora da faixa", () => {
    const store = fakeStorage({ "sciencechat.dock": JSON.stringify({ width: 1, height: 99999 }) });
    expect(readDockPrefs(store)).toEqual({
      open: true,
      width: DOCK_MIN_WIDTH,
      height: DOCK_MAX_HEIGHT,
    });
  });

  it("não quebra com JSON inválido", () => {
    const store = fakeStorage({ "sciencechat.dock": "{não é json" });
    expect(readDockPrefs(store)).toEqual({ open: true, width: 360, height: 600 });
  });
});
