import { describe, expect, it } from "vitest";
import { chatErrorAction } from "@/lib/ai/chat-error";

describe("chatErrorAction", () => {
  it("cota esgotada manda o Pracinha descansar", () => {
    expect(chatErrorAction("PRACINHA_QUOTA_EXHAUSTED")).toEqual({ kind: "rest" });
    expect(chatErrorAction("daily free allocation of 10,000 neurons")).toEqual({ kind: "rest" });
  });

  it("sessão expirada não vira 'tente de novo'", () => {
    expect(chatErrorAction("Não autorizado", 401)).toEqual({
      kind: "toast",
      message: "Sua sessão expirou. Entre novamente para continuar.",
    });
  });

  it("artigo inexistente diz o que fazer", () => {
    expect(chatErrorAction("Artigo não encontrado", 404).kind).toBe("toast");
    expect(chatErrorAction("Artigo não encontrado", 404)).toMatchObject({
      message: expect.stringContaining("não existe mais"),
    });
  });

  it("429 mostra a espera do Retry-After", () => {
    expect(chatErrorAction('{"retryAfterSec":42}', 429)).toEqual({
      kind: "toast",
      message: "Muitas requisições. Tente de novo em 42 s.",
    });
    expect(chatErrorAction("", 429)).toEqual({
      kind: "toast",
      message: "Muitas requisições. Aguarde um pouco.",
    });
  });

  it("erro desconhecido mantém a mensagem genérica", () => {
    expect(chatErrorAction("boom", 500)).toEqual({
      kind: "toast",
      message: "Não foi possível enviar. Tente de novo.",
    });
    expect(chatErrorAction(undefined, undefined).kind).toBe("toast");
  });
});
