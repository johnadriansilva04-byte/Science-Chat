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
} from "@/lib/ai/interview-guard";
import { interviewNotes } from "@/lib/interview-notes";

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
