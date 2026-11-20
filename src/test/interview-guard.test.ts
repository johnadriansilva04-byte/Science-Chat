/**
 * A entrevista travava: ao colar um texto longo, o modelo parafraseava o que
 * leu ("Você está propondo uma abordagem metodológica rigorosa…") e não fazia
 * pergunta. Estes testes garantem que toda resposta da entrevista termina com
 * uma pergunta sobre a próxima lacuna real.
 */
import { describe, expect, it } from "vitest";
import type { TextStreamPart, ToolSet } from "ai";
import {
  answeredSections,
  ensureInterviewQuestion,
  interviewQuestionTransform,
  nextInterviewQuestion,
  singleQuestion,
} from "@/lib/ai/interview-guard";
import { collectInterviewNotes, interviewNotes } from "@/lib/interview-notes";

const msg = (role: string, text: string) => ({
  role,
  parts: [{ type: "text", text }],
});

const PARAPHRASE =
  "Você está propondo uma abordagem metodológica rigorosa e transparente, onde a ausência " +
  "de credencial acadêmica é tratada como uma condição experimental declarada, e não como " +
  "um defeito a compensar. Isso é interessante e ético.";

describe("ensureInterviewQuestion", () => {
  it("acrescenta a pergunta da próxima lacuna quando o modelo só parafraseia", () => {
    const notes = interviewNotes([
      msg("assistant", "Qual é a sua tese?"),
      msg("user", "Minha tese é que a adversidade precoce reorganiza a atenção."),
    ]);
    const out = ensureInterviewQuestion(PARAPHRASE, notes);
    expect(out).toContain("Você está propondo uma abordagem metodológica");
    expect(out.trim().endsWith("?")).toBe(true);
    // A Introdução já foi respondida: a próxima lacuna é a fundamentação.
    expect(out).toContain("autores ou teorias");
  });

  it("não mexe em resposta que já pergunta", () => {
    const text = "Entendi a sua tese. Quais autores sustentam essa ideia?";
    expect(ensureInterviewQuestion(text, [])).toBe(text);
  });

  it("respeita o protocolo de fechamento (convite a concluir)", () => {
    const text = "Recapitulando: sua pesquisa é X. Agora você pode clicar em Concluir entrevista.";
    expect(ensureInterviewQuestion(text, [])).toBe(text);
  });

  it("nunca devolve vazio", () => {
    const out = ensureInterviewQuestion("   ", []);
    expect(out.trim().length).toBeGreaterThan(0);
    expect(out.trim().endsWith("?")).toBe(true);
  });

  it("avança para a próxima lacuna conforme as seções são respondidas", () => {
    // Cada nota é classificada pela palavra-chave da pergunta (ver SECTION_RULES).
    const answered = [
      { question: "Qual é o objetivo e a pergunta central?", answer: "x" },
      { question: "Quais autores e teorias sustentam isso?", answer: "x" },
      { question: "Qual é a metodologia e o procedimento?", answer: "x" },
      { question: "Quais resultados você já tem?", answer: "x" },
      { question: "O que isso significa na discussão?", answer: "x" },
    ];
    expect(nextInterviewQuestion(answered)).toContain("conclusão");
    // Respondida a conclusão, não sobra lacuna: vira aprofundamento.
    const all = [...answered, { question: "Qual é a conclusão?", answer: "x" }];
    expect(nextInterviewQuestion(all)).toContain("mais frágil");
  });

  // Regressão (visto no chat real): o guard reenviava a MESMA pergunta em todo
  // turno. As perguntas do próprio guard não contêm as palavras-chave da seção
  // ("Como você vai demonstrar isso?" não diz "metod"), caíam em "Outras
  // informações" e a lacuna nunca era marcada como respondida. O histórico real
  // ficou com "O que muda na área se a sua tese estiver certa…" repetida 4×.
  it("percorre as seis lacunas sem repetir pergunta", () => {
    const messages: { role: string; parts: { type: string; text: string }[] }[] = [];
    const asked: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const question = nextInterviewQuestion(interviewNotes(messages));
      asked.push(question);
      messages.push(
        { role: "assistant", parts: [{ type: "text", text: question }] },
        { role: "user", parts: [{ type: "text", text: `resposta ${i + 1}` }] },
      );
    }
    expect(new Set(asked).size).toBe(asked.length);
    expect(asked[0]).toContain("pergunta central");
    expect(asked[5]).toContain("conclusão");
    expect(asked[6]).toContain("mais frágil");
  });

  // Regressão (visto no histórico real): o pesquisador reenviou a mesma resposta
  // várias vezes. As notas exibidas são podadas (dedupeNotes) e a seção voltava a
  // parecer aberta, então o guard repetia a MESMA pergunta turno após turno.
  it("não trava quando a mesma resposta se repete", () => {
    const messages: { role: string; parts: { type: string; text: string }[] }[] = [];
    const answer = "A pergunta central é se dá para publicar sem vínculo institucional.";
    const asked: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const question = nextInterviewQuestion(collectInterviewNotes(messages));
      asked.push(question);
      messages.push(
        { role: "assistant", parts: [{ type: "text", text: question }] },
        { role: "user", parts: [{ type: "text", text: answer }] },
      );
    }
    expect(new Set(asked).size).toBe(asked.length);
    // A poda continua valendo para a FOLHA: a resposta repetida não se multiplica.
    expect(interviewNotes(messages)).toHaveLength(1);
  });

  it("não repete a pergunta de aprofundamento quando não há mais lacuna", () => {
    const notes = [
      { question: "Qual é a pergunta central?", answer: "x" },
      { question: "Quais autores e teorias sustentam isso?", answer: "x" },
      { question: "Qual é a metodologia e o procedimento?", answer: "x" },
      { question: "Quais resultados você já tem?", answer: "x" },
      { question: "O que isso significa na discussão?", answer: "x" },
      { question: "Qual é a conclusão?", answer: "x" },
    ];
    const first = nextInterviewQuestion(notes);
    const second = nextInterviewQuestion([...notes, { question: first, answer: "x" }]);
    expect(second).not.toBe(first);
    expect(second.trim().endsWith("?")).toBe(true);
  });

  it("pergunta de discussão do guard conta como Discussão respondida", () => {
    const notes = [
      {
        question:
          "O que muda na área se a sua tese estiver certa — e qual é o limite mais honesto dela?",
        answer: "Muda o acesso.",
      },
    ];
    expect([...answeredSections(notes)]).toEqual(["Discussão"]);
  });

  // Regressão (visto no histórico real): esgotadas as perguntas de aprofundamento,
  // o guard repetia a última em todo turno e a entrevista nunca fechava.
  it("convida a concluir quando não há mais o que perguntar", () => {
    const notes: { question: string; answer: string }[] = [];
    let question = nextInterviewQuestion(notes);
    for (let i = 0; i < 40 && question.trim().endsWith("?"); i += 1) {
      notes.push({ question, answer: `resposta ${i}` });
      question = nextInterviewQuestion(notes);
    }
    expect(question).toContain("Concluir entrevista");
    expect(question.trim().endsWith("?")).toBe(false);
    // E o mesmo convite se repete — sem voltar a perguntar.
    const again = nextInterviewQuestion([...notes, { question, answer: "ok" }]);
    expect(again).toBe(question);
  });

  // Regressão (visto no chat real): "Posso submeter sem vínculo?" foi tratada
  // como resposta da Introdução, e a lacuna da pergunta central nunca foi feita.
  it("pergunta do pesquisador não fecha a lacuna", () => {
    const notes = [
      { question: "Qual é a pergunta central?", answer: "Posso submeter sem vínculo?" },
    ];
    expect([...answeredSections(notes)]).not.toContain("Introdução");
    expect(nextInterviewQuestion(notes)).toContain("pergunta central");
  });
});

describe("interviewQuestionTransform", () => {
  const run = async (chunks: string[], notes = interviewNotes([])) => {
    const transform = interviewQuestionTransform(notes);
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const readAll = (async () => {
      let out = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.type === "text-delta") out += value.text;
      }
      return out;
    })();
    for (const text of chunks) {
      await writer.write({ type: "text-delta", id: "t1", text } as TextStreamPart<ToolSet>);
    }
    await writer.close();
    return readAll;
  };

  it("acrescenta a pergunta no fim do stream quando falta", async () => {
    const out = await run(["Você está propondo ", "uma hipótese sobre a atenção."]);
    expect(out).toContain("Você está propondo uma hipótese sobre a atenção.");
    expect(out.trim().endsWith("?")).toBe(true);
  });

  it("nunca deixa a resposta vazia quando o modelo só chama ferramentas", async () => {
    // Caso real: 3 tool calls (pesquisar_bases, listar_anexos) e ZERO texto.
    const transform = interviewQuestionTransform(interviewNotes([]));
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const readAll = (async () => {
      let out = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.type === "text-delta") out += value.text;
      }
      return out;
    })();
    await writer.write({
      type: "tool-result",
      toolCallId: "c1",
      toolName: "listar_anexos",
      input: {},
      output: "Nenhum anexo ainda.",
    } as unknown as TextStreamPart<ToolSet>);
    await writer.close();
    const out = await readAll;
    expect(out.trim().length).toBeGreaterThan(0);
    expect(out.trim().endsWith("?")).toBe(true);
  });

  it("preserva o stream que já pergunta", async () => {
    const out = await run(["Qual é a pergunta central ", "que o artigo responde?"]);
    expect(out).toBe("Qual é a pergunta central que o artigo responde?");
  });
});

describe("singleQuestion", () => {
  it("mantém a pergunta de conteúdo e descarta a de ORCID no mesmo turno", () => {
    const text =
      "Com base no que você trouxe, a evidência é fraca. " +
      "Qual é a pergunta central que o artigo quer responder? " +
      "Agora, você tem um ORCID?";
    const out = singleQuestion(text);
    expect(out).toContain("pergunta central");
    expect(out).toBe(
      "Com base no que você trouxe, a evidência é fraca. Qual é a pergunta central que o artigo quer responder?",
    );
  });

  it("não mexe em turno com uma pergunta só", () => {
    const text = "Entendi. Qual é a sua tese?";
    expect(singleQuestion(text)).toBe(text);
  });
});

describe("interviewQuestionTransform — pergunta de identidade", () => {
  async function run(text: string): Promise<string> {
    const transform = interviewQuestionTransform(interviewNotes([]));
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const out: Promise<string> = (async () => {
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return acc;
        if (value.type === "text-delta") acc += value.text;
      }
    })();
    for (const piece of text.split(/(?<=\s)/)) {
      await writer.write({ type: "text-delta", id: "t", text: piece } as TextStreamPart<ToolSet>);
    }
    await writer.close();
    return out;
  }

  it("suprime a segunda pergunta (ORCID) que roubaria a resposta da tese", async () => {
    const text =
      "Sua tese está clara. Qual é a pergunta central do artigo? Agora, você tem um ORCID?";
    const out = await run(text);
    expect(out).toContain("pergunta central");
    expect(out.toLowerCase()).not.toContain("orcid");
  });

  it("preserva o conteúdo inteiro quando só há uma pergunta", async () => {
    const text = "Entendi a sua tese. Quais materiais você vai analisar?";
    const out = await run(text);
    expect(out).toContain("Entendi a sua tese.");
    expect(out).toContain("Quais materiais você vai analisar?");
  });
});

describe("nextInterviewQuestion — não repete a pergunta (histórico real)", () => {
  const M = (role: string, text: string) => ({ role, parts: [{ type: "text", text }] });

  it("avança quando o pesquisador responde com outra pergunta", () => {
    const notes = collectInterviewNotes([
      M("user", "A ausência de vínculo muda o método?"),
      M("assistant", "O que muda na área se a sua tese estiver certa?"),
      M("user", "Posso submeter um artigo sem vínculo institucional?"),
    ]);
    const next = nextInterviewQuestion(notes);
    expect(next).not.toContain("O que muda na área");
  });

  it("não repete a mesma pergunta mais de duas vezes", () => {
    const messages: ReturnType<typeof M>[] = [M("user", "Quero publicar sem vínculo.")];
    const seen = new Map<string, number>();
    for (let i = 0; i < 8; i++) {
      const question = nextInterviewQuestion(collectInterviewNotes(messages));
      seen.set(question, (seen.get(question) ?? 0) + 1);
      messages.push(M("assistant", question), M("user", "Continuar"));
    }
    for (const [question, times] of seen) {
      expect(times, `pergunta repetida: ${question}`).toBeLessThanOrEqual(2);
    }
  });
});

describe("nextInterviewQuestion — respeita a ordem das seções", () => {
  const M = (role: string, text: string) => ({ role, parts: [{ type: "text", text }] });

  // Regressão (visto no chat real): o pesquisador respondeu à pergunta de
  // Metodologia com outra pergunta ("Posso submeter sem vínculo?"). A lacuna
  // continuava aberta, mas como a pergunta JÁ havia sido feita, o guard pulava
  // para a próxima lacuna nunca perguntada — e a entrevista ia de Fundamentação
  // direto para Resultados, deixando a Metodologia vazia para sempre.
  it("não pula a Metodologia quando a resposta foi outra pergunta", () => {
    const notes = collectInterviewNotes([
      M("user", "A ausência de vínculo institucional muda o método científico?"),
      M(
        "assistant",
        "Para eu fechar o problema: qual é a pergunta central que o artigo quer responder, em uma frase?",
      ),
      M(
        "user",
        "Quero saber se um pesquisador sem vínculo consegue publicar em revista revisada por pares.",
      ),
      M(
        "assistant",
        "Quais autores ou teorias sustentam essa ideia — e qual é a objeção mais forte que você já ouviu contra ela?",
      ),
      M(
        "user",
        "Merton e Latour sustentam que a ciência é uma instituição social. A objeção é que sem laboratório não há dados.",
      ),
      M(
        "assistant",
        "Como você vai demonstrar isso: quais materiais, procedimentos ou critérios de análise vai usar?",
      ),
      M("user", "Posso submeter um artigo sem vínculo institucional?"),
    ]);
    expect(nextInterviewQuestion(notes)).toContain("Como você vai demonstrar");
  });
});
