import { describe, expect, it } from "vitest";
import { pickVoiceName, splitSentences } from "@/lib/speech";

describe("splitSentences", () => {
  it("divide em frases curtas e remove markdown", () => {
    const out = splitSentences("**Olá** — tudo bem? Este é um texto longo. Ele segue em frente.");
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.join(" ")).not.toContain("*");
    expect(out.join(" ")).toContain("Olá");
  });

  it("não devolve nada para texto vazio", () => {
    expect(splitSentences("   ")).toEqual([]);
    expect(splitSentences("```js\nconst x = 1;\n```")).toEqual([]);
  });

  it("quebra frases muito longas em pedaços faláveis", () => {
    const long = `${"palavra ".repeat(60).trim()}.`;
    const out = splitSentences(long, 90);
    expect(out.length).toBeGreaterThan(1);
    expect(out.every((c) => c.length <= 200)).toBe(true);
  });

  it("remove links mantendo o rótulo", () => {
    const out = splitSentences("Veja [o artigo](https://exemplo.org).");
    expect(out.join(" ")).toContain("o artigo");
    expect(out.join(" ")).not.toContain("https");
  });
});

describe("pickVoiceName", () => {
  const voices = [
    { name: "Microsoft Maria", lang: "pt-BR", localService: true },
    { name: "Google português", lang: "pt-PT", localService: false },
    { name: "Alice", lang: "it-IT", localService: true },
  ];

  it("prefere a voz do idioma exato", () => {
    expect(pickVoiceName(voices, "pt-BR")).toBe("Microsoft Maria");
  });

  it("cai para o mesmo idioma-base quando não há exato", () => {
    expect(pickVoiceName(voices, "pt-MZ")).toBe("Microsoft Maria");
  });

  it("devolve null sem vozes", () => {
    expect(pickVoiceName([], "pt-BR")).toBeNull();
  });
});
