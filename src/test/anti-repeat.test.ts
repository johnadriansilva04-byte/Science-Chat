import { describe, expect, it } from "vitest";
import {
  cleanAssistantText,
  collectAssistantSentences,
  buildAntiRepeatStream,
  extractComplete,
  isCloserSentence,
  normalizeSentence,
} from "@/lib/ai/anti-repeat";
import type { ModelMessage, TextStreamPart, ToolSet } from "ai";

/** Roda um texto pelo transform como se viesse em deltas de 1 caractere. */
async function throughTransform(
  chunks: string[],
  seed: string[] = [],
): Promise<{ text: string; nonText: TextStreamPart<ToolSet>[] }> {
  const transform = buildAntiRepeatStream(seed);
  const writer = transform.writable.getWriter();
  const reader = transform.readable.getReader();
  const parts: TextStreamPart<ToolSet>[] = [];
  const readAll = (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }
  })();
  for (const text of chunks) {
    await writer.write({ type: "text-delta", id: "t1", text });
  }
  await writer.close();
  await readAll;
  const text = parts
    .filter((p) => p.type === "text-delta")
    .map((p) => (p as { text: string }).text)
    .join("");
  return { text, nonText: parts.filter((p) => p.type !== "text-delta") };
}

describe("anti-repeat", () => {
  it("extrai frases completas e não corta em abreviações", () => {
    const { parts, rest } = extractComplete("Como Maguire et al. (2000) mostram. O cérebro muda.");
    expect(parts.map((p) => p.sentence)).toEqual([
      "Como Maguire et al. (2000) mostram.",
      "O cérebro muda.",
    ]);
    expect(rest).toBe("");
  });

  it("deixa em aberto a frase incompleta", () => {
    const { parts, rest } = extractComplete("Primeira frase. Segunda ainda incom");
    expect(parts.map((p) => p.sentence)).toEqual(["Primeira frase."]);
    expect(rest).toBe("Segunda ainda incom");
  });

  it("reconhece os clichês de fecho, mas não texto legítimo", () => {
    expect(isCloserSentence("Qual é o próximo passo para o artigo?")).toBe(true);
    expect(isCloserSentence("O que mais você gostaria de acrescentar?")).toBe(true);
    expect(isCloserSentence("Como posso ajudar?")).toBe(true);
    expect(isCloserSentence("A neuroplasticidade é o mecanismo que sustenta a tese.")).toBe(false);
    // Frase longa que por acaso cita a fórmula não é clichê.
    const long =
      "Muitos tutores encerram com uma pergunta genérica do tipo qual é o próximo passo, e isso " +
      "esvazia o diálogo porque não acrescenta nada de novo ao trabalho do pesquisador em curso.";
    expect(isCloserSentence(long)).toBe(false);
  });

  it("reconhece o convite vago a explorar, mas não a oferta concreta", () => {
    expect(
      isCloserSentence(
        "Você gostaria de explorar algum tópico específico dentro da neuroplasticidade?",
      ),
    ).toBe(true);
    expect(isCloserSentence("Gostaria de conversar mais sobre o método?")).toBe(true);
    // Oferta concreta (com item real) NÃO é clichê.
    expect(
      isCloserSentence("Gostaria de incluir o estudo de Maguire (2000) na fundamentação?"),
    ).toBe(false);
  });

  it("remove o clichê de fecho quando há conteúdo", () => {
    const text =
      "A tese ganha força quando você separa o gatilho da capacidade.\n\nQual é o próximo passo?";
    expect(cleanAssistantText(text)).toBe(
      "A tese ganha força quando você separa o gatilho da capacidade.",
    );
  });

  it("NUNCA zera a resposta: mantém o clichê se for tudo o que existe", () => {
    expect(cleanAssistantText("O que mais você gostaria de acrescentar?")).toBe(
      "O que mais você gostaria de acrescentar?",
    );
  });

  it("remove frases repetidas dentro da mesma mensagem", () => {
    const text =
      "O hipocampo se reorganiza com o treino. " +
      "O hipocampo se reorganiza com o treino. " +
      "Isso sustenta a tese.";
    expect(cleanAssistantText(text)).toBe(
      "O hipocampo se reorganiza com o treino. Isso sustenta a tese.",
    );
  });

  it("não repete uma frase que já está no histórico (semente)", () => {
    const seed = [normalizeSentence("A neuroplasticidade é um mecanismo geral da espécie.")];
    const text =
      "A neuroplasticidade é um mecanismo geral da espécie. " +
      "O gatilho, porém, foi a doença — e isso muda a leitura.";
    expect(cleanAssistantText(text, seed)).toBe(
      "O gatilho, porém, foi a doença — e isso muda a leitura.",
    );
  });

  it("coleta frases do assistente no histórico, ignorando os clichês", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "Olá" },
      {
        role: "assistant",
        content: "A tese é generalizável quanto à estrutura. Qual é o próximo passo?",
      },
    ];
    const seed = collectAssistantSentences(messages);
    expect(seed).toContain(normalizeSentence("A tese é generalizável quanto à estrutura."));
    expect(seed).not.toContain(normalizeSentence("Qual é o próximo passo?"));
  });

  it("no stream, descarta o fecho quando há conteúdo", async () => {
    const { text } = await throughTransform([
      "A neuroplasticidade sustenta a tese. ",
      "O gatilho foi a doença. ",
      "O que mais você gostaria de acrescentar?",
    ]);
    expect(text).toBe("A neuroplasticidade sustenta a tese. O gatilho foi a doença. ");
    expect(text).not.toContain("gostaria");
  });

  it("no stream, libera o fecho quando é a única coisa dita", async () => {
    const { text } = await throughTransform(["O que mais você gostaria de acrescentar?"]);
    expect(text).toBe("O que mais você gostaria de acrescentar?");
  });

  it("no stream, não repete frase já dita no histórico", async () => {
    const { text } = await throughTransform(
      ["A neuroplasticidade é um mecanismo geral. ", "O gatilho foi a doença."],
      [normalizeSentence("A neuroplasticidade é um mecanismo geral.")],
    );
    expect(text).toBe("O gatilho foi a doença.");
  });

  it("no stream, deixa passar partes que não são texto", async () => {
    const transform = buildAntiRepeatStream();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const readAll = (async () => {
      const out: TextStreamPart<ToolSet>[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        out.push(value);
      }
      return out;
    })();
    await writer.write({ type: "text-start", id: "t1" });
    await writer.write({ type: "text-delta", id: "t1", text: "Conteúdo novo aqui." });
    await writer.write({ type: "text-end", id: "t1" });
    await writer.close();
    const parts = await readAll;
    expect(parts.map((p) => p.type)).toEqual(["text-start", "text-delta", "text-end"]);
  });
});
