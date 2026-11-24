import { describe, expect, it } from "vitest";

import { STOP_LEVELS, levelsOfCampaign } from "@/lib/stop";
import {
  STOP_ACTS,
  STOP_SAGA_STAKE,
  actOfCampaign,
  duelForLevel,
  duelWon,
  squadLabel,
  squadSize,
} from "@/lib/stop-saga";

describe("saga da campanha", () => {
  it("dá um oponente nomeado para cada fase", () => {
    for (const level of STOP_LEVELS) {
      const duel = duelForLevel(level);
      expect(duel.rival.name.length).toBeGreaterThan(3);
      expect(duel.rival.taunt.length).toBeGreaterThan(10);
      expect(duel.rival.defeat.length).toBeGreaterThan(5);
      expect(duel.rival.gloat.length).toBeGreaterThan(5);
    }
  });

  it("cresce o esquadrão conforme o campeonato avança", () => {
    const sizes = STOP_LEVELS.map((level) => squadSize(level));
    expect(sizes[0]).toBe(1);
    expect(sizes.at(-1)).toBe(10);
    for (let index = 1; index < sizes.length; index += 1) {
      expect(sizes[index]!).toBeGreaterThanOrEqual(sizes[index - 1]!);
    }
  });

  it("usa a meta da fase como alvo do duelo", () => {
    for (const level of STOP_LEVELS) {
      expect(duelForLevel(level).target).toBe(level.meta);
    }
  });

  it("vence só a partir da primeira estrela", () => {
    expect(duelWon(0)).toBe(false);
    expect(duelWon(1)).toBe(true);
    expect(duelWon(3)).toBe(true);
  });

  it("dá um ato para cada campanha", () => {
    for (const act of STOP_ACTS) {
      expect(levelsOfCampaign(act.campaign).length).toBeGreaterThan(0);
      expect(act.act).toMatch(/^Ato [IVX]+$/);
      expect(act.hook.length).toBeGreaterThan(20);
    }
    expect(actOfCampaign("bancada").act).toBe("Ato V");
  });

  it("escreve o placar do duelo em português", () => {
    expect(squadLabel(1)).toBe("1 contra 1");
    expect(squadLabel(10)).toBe("1 contra 10");
  });

  it("deixa claro o que está em disputa", () => {
    expect(STOP_SAGA_STAKE).toContain("continuar sendo lido");
  });
});
