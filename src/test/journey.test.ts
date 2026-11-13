import { describe, expect, it } from "vitest";
import { JOURNEY_ACTS, journeyIndex, journeyPercent, actAt } from "@/lib/journey";

describe("journeyIndex", () => {
  it("começa na Ignição com conversa curta", () => {
    expect(journeyIndex({ phase: "interview", interviewRatio: 0 })).toBe(0);
  });
  it("vira Interrogatório quando a conversa avança", () => {
    expect(journeyIndex({ phase: "interview", interviewRatio: 0.4 })).toBe(1);
    expect(journeyIndex({ phase: "interview", hasDraft: true })).toBe(1);
  });
  it("plano é Estrutura", () => {
    expect(journeyIndex({ phase: "plan" })).toBe(2);
  });
  it("escrita sem páginas aprovadas ainda é Estrutura", () => {
    expect(journeyIndex({ phase: "writing", approvedPages: 0 })).toBe(2);
    expect(journeyIndex({ phase: "writing", approvedPages: 2 })).toBe(3);
  });
  it("concluído é Obra", () => {
    expect(journeyIndex({ phase: "done" })).toBe(JOURNEY_ACTS.length - 1);
  });
});

describe("journeyPercent", () => {
  it("na Ignição mede a razão da entrevista", () => {
    expect(journeyPercent({ phase: "interview", interviewRatio: 0.2 })).toBe(20);
  });
  it("na Produção mede páginas aprovadas sobre o total", () => {
    expect(journeyPercent({ phase: "writing", approvedPages: 3, totalPages: 4 })).toBe(75);
  });
  it("na Obra é 100%", () => {
    expect(journeyPercent({ phase: "done" })).toBe(100);
  });
});

describe("actAt", () => {
  it("fixa os limites", () => {
    expect(actAt(-5).id).toBe("ignite");
    expect(actAt(99).id).toBe("work");
  });
});
