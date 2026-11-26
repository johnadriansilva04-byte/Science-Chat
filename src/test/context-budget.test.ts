import { describe, expect, it } from "vitest";
import { CLIPPED_MARKER, clipText } from "@/lib/ai/context-budget";

describe("clipText", () => {
  it("devolve o texto intacto quando cabe no teto", () => {
    expect(clipText("abc", 10)).toBe("abc");
    expect(clipText("", 10)).toBe("");
  });

  it("corta o meio preservando começo e fim", () => {
    const text = `INICIO-${"x".repeat(500)}-FIM`;
    const out = clipText(text, 120);

    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.startsWith("INICIO-")).toBe(true);
    expect(out.endsWith("-FIM")).toBe(true);
    expect(out).toContain(CLIPPED_MARKER);
  });

  it("respeita teto zero ou inválido sem quebrar", () => {
    expect(clipText("abc", 0)).toBe("");
    expect(clipText("abc", Number.NaN)).toBe("");
  });
});
