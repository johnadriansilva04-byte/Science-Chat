import { describe, expect, it } from "vitest";
import {
  cleanAssistantText,
  collectAssistantSentences,
  buildAntiRepeatStream,
  extractComplete,
  isCloserSentence,
  isFillerSentence,
  isGreetingSentence,
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
    expect(isCloserSentence("Qual é a próxima etapa para o artigo?")).toBe(true);
    expect(isCloserSentence("Qual seria o próximo passo?")).toBe(true);
    expect(isCloserSentence("O que mais você gostaria de acrescentar?")).toBe(true);
    expect(isCloserSentence("Como posso ajudar?")).toBe(true);
    // Visto no chat real: o Pracinha devolvia a condução ao pesquisador em vez
    // de fazer a pergunta da entrevista.
    expect(isCloserSentence("Qual é a sua próxima pergunta?")).toBe(true);
    expect(isCloserSentence("Qual é a sua próxima dúvida?")).toBe(true);
    expect(isCloserSentence("O que você gostaria de saber agora?")).toBe(true);
    expect(isCloserSentence("Como mais posso te ajudar?")).toBe(true);
    expect(isCloserSentence("A neuroplasticidade é o mecanismo que sustenta a tese.")).toBe(false);
    // Pergunta concreta da entrevista NÃO é clichê: é o trabalho do Pracinha.
    expect(isCloserSentence("Quantos participantes você pretende incluir?")).toBe(false);
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

  // Regressão: no meio da conversa o Pracinha se reapresentava ("Olá, sou o
  // Pracinha, assistente da ScienceChat") como se o diálogo tivesse recomeçado.
  it("remove a reapresentação a partir do 2º turno", () => {
    const said = "Olá, sou Pracinha, assistente da ScienceChat. Qual é a sua tese?";
    expect(isGreetingSentence("Olá, sou Pracinha, assistente da ScienceChat.")).toBe(true);
    expect(isGreetingSentence("Qual é a sua tese?")).toBe(false);

    const first = cleanAssistantText(said, []);
    expect(first).toContain("Olá");

    const later = cleanAssistantText(said, ["frase anterior qualquer"]);
    expect(later).not.toContain("Olá, sou Pracinha");
    expect(later).toContain("Qual é a sua tese?");
  });
  // Regressão: o filtro de saudação existia só em `cleanAssistantText` (texto
  // final/salvo). O que o pesquisador VÊ vem do stream, que nunca chamava
  // `isGreetingSentence` — daí o "Olá, sou o Pracinha…" reaparecer no meio da
  // conversa depois de uma mensagem longa.
  it("remove a reapresentação já no stream, a partir do 2º turno", async () => {
    const said = "Olá, sou o Pracinha, assistente da ScienceChat. Qual é a sua tese em uma frase?";
    const { text } = await throughTransform([...said], ["uma fala anterior"]);
    expect(text).not.toContain("sou o Pracinha");
    expect(text).toContain("Qual é a sua tese");
  });

  it("mantém a apresentação no primeiro turno do stream", async () => {
    const said = "Olá, sou o Pracinha, assistente da ScienceChat. Vamos começar?";
    const { text } = await throughTransform([...said], []);
    expect(text).toContain("Pracinha");
  });
});

// No chat real o Pracinha se reapresentava no meio do diálogo ("Olá! Sou o
// Pracinha, assistente da ScienceChat") e sobrava um "Olá!" solto depois do corte.
describe("saudação repetida", () => {
  it("reconhece a reapresentação e a saudação solta", () => {
    expect(isGreetingSentence("Olá! Sou o Pracinha, assistente da ScienceChat.")).toBe(true);
    expect(isGreetingSentence("Sou o Pracinha, assistente da ScienceChat.")).toBe(true);
    expect(isGreetingSentence("Olá!")).toBe(true);
    expect(isGreetingSentence("Tudo bem!")).toBe(true);
  });

  it("não confunde conteúdo que começa com palavra de saudação", () => {
    expect(isGreetingSentence("Tudo bem delimitado, o escopo é claro.")).toBe(false);
    expect(isGreetingSentence("Oi, Pracinha, preciso de ajuda com o método.")).toBe(false);
  });

  it("remove a reapresentação inteira no meio da conversa", () => {
    const text =
      "Olá! Sou o Pracinha, assistente da ScienceChat. Estou aqui para ajudar você a " +
      "construir seu artigo científico. Vamos começar a estruturar o artigo?";
    expect(cleanAssistantText(text, ["frase anterior"])).toBe("");
  });

  it("preserva conteúdo quando só a saudação inicial sobra", () => {
    expect(cleanAssistantText("Olá! A tese é defensável e tem limites claros.", ["x"])).toBe(
      "A tese é defensável e tem limites claros.",
    );
  });
});

describe("isFillerSentence — encheção de linguiça", () => {
  // Frases literais do chat real que empurraram o pesquisador para o desânimo.
  const REAIS = [
    "a influência do vínculo institucional no método científico é um tema relevante e amplo",
    "É um assunto complexo e multidisciplinar.",
    "O tema é abordado em diversas áreas do conhecimento, como psicologia, sociologia e ciência da informação.",
    "A literatura científica sugere que a ausência de vínculo pode influenciar o método.",
    "É uma questão ampla e relevante para a área.",
    "O assunto vem ganhando crescente destaque no cenário atual.",
  ];

  for (const frase of REAIS) {
    it(`barra a encheção: "${frase.slice(0, 45)}…"`, () => {
      expect(isFillerSentence(frase)).toBe(true);
    });
  }

  it("preserva frase com dado concreto, mesmo usando 'relevante'", () => {
    expect(
      isFillerSentence(
        "Silva (2021) mostra que 63% dos periódicos exigem filiação institucional na submissão.",
      ),
    ).toBe(false);
    expect(isFillerSentence("A revista aceita submissão sem vínculo desde 2019.")).toBe(false);
  });

  it("não toca em frase argumentativa comum", () => {
    expect(isFillerSentence("Becker (1963) deslocou o olhar para a rotulagem social.")).toBe(false);
  });
});

describe("cleanAssistantText — encheção de linguiça", () => {
  it("remove a encheção e mantém a resposta real", () => {
    const text =
      "A sua pergunta é se a ausência de vínculo muda o método. " +
      "A literatura científica sugere que é um tema relevante e amplo. " +
      "Nenhum dos trabalhos que achei mede isso diretamente.";
    const out = cleanAssistantText(text);
    expect(out).toContain("muda o método");
    expect(out).toContain("Nenhum dos trabalhos");
    expect(out).not.toContain("relevante e amplo");
  });

  it("nunca devolve vazio: se só há encheção, ela é liberada", () => {
    expect(cleanAssistantText("É um tema relevante e amplo.").length).toBeGreaterThan(0);
  });
});
