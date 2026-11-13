import { describe, expect, it } from "vitest";
import { countdownLabel, formatResetTime, isQuotaError, nextQuotaReset } from "@/lib/ai/quota";

describe("isQuotaError", () => {
  it("reconhece a mensagem de neurônios esgotados", () => {
    expect(isQuotaError("you have used up your daily free allocation of 10,000 neurons")).toBe(
      true,
    );
    expect(isQuotaError("4006: quota exceeded")).toBe(true);
  });
  it("não confunde erros comuns", () => {
    expect(isQuotaError("Não autorizado")).toBe(false);
    expect(isQuotaError(undefined)).toBe(false);
  });
});

describe("nextQuotaReset", () => {
  it("aponta para a próxima meia-noite UTC", () => {
    const now = Date.UTC(2026, 0, 5, 23, 30, 0);
    expect(nextQuotaReset(now)).toBe(Date.UTC(2026, 0, 6, 0, 0, 0));
  });
});

describe("countdownLabel", () => {
  it("formata horas e minutos", () => {
    const now = Date.UTC(2026, 0, 5, 22, 0, 0);
    const reset = Date.UTC(2026, 0, 6, 0, 0, 0);
    expect(countdownLabel(reset, now)).toBe("2h 00min");
  });
  it("indica quando já voltou", () => {
    expect(countdownLabel(1000, 2000)).toBe("já voltou");
  });
});

describe("formatResetTime", () => {
  it("produz uma hora HH:MM", () => {
    expect(formatResetTime(Date.UTC(2026, 0, 6, 0, 0, 0))).toMatch(/\d{2}:\d{2}/);
  });
});
