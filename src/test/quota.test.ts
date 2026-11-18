import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  formatResetTime,
  isQuotaError,
  nextQuotaReset,
  quotaRestMessage,
} from "@/lib/ai/quota";

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

  it("não trata um 429 transitório como cota diária esgotada", () => {
    // Um "rate limit"/429 se resolve em segundos. Antes, ele era classificado
    // como cota e o chat ficava travado até a meia-noite UTC.
    expect(isQuotaError("429 Too Many Requests")).toBe(false);
    expect(isQuotaError("rate limit exceeded")).toBe(false);
    expect(isQuotaError("Muitas requisições. Tente novamente em instantes.")).toBe(false);
  });

  it("ainda reconhece a exaustão real da cota", () => {
    expect(isQuotaError("quota exceeded")).toBe(true);
    expect(isQuotaError("you have used up your daily free allocation of 10,000 neurons")).toBe(
      true,
    );
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

describe("quotaRestMessage", () => {
  it("devolve uma mensagem amigável quando a cota esgotou", () => {
    const msg = quotaRestMessage("4006: daily free allocation of 10,000 neurons exhausted");
    expect(msg).toContain("Pracinha cansou");
    expect(msg).toMatch(/\d{2}:\d{2}/);
  });
  it("devolve null quando não é caso de cota", () => {
    expect(quotaRestMessage("Não autorizado")).toBeNull();
    expect(quotaRestMessage(undefined)).toBeNull();
  });
});
