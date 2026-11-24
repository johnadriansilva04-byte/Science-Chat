import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanInterviewReply,
  cleanMethodologyReply,
  splitMethodReply,
  METHODOLOGY_SPEC_SECTIONS,
  methodologyLinkError,
  methodologyProtocolCode,
  methodologySectionText,
  methodologySpecBlock,
  methodologyTitleFromSeed,
  matchMethodologyReference,
  parseMethodologyCommand,
  specCoverageRatio,
  specSectionCoverage,
  type MethodologyLike,
} from "@/lib/methodology";
import { buildPagePrompt } from "@/lib/article-page";

const APPROVED_SPEC = `## Tipo de estudo e justificativa
Estudo de caso instrumental (Stake).

## Instrumento analítico
Método Pracinha — A = fato empírico de documento primário; B = variáveis administrativas; D = ato decorrente.
`;

function methodology(overrides: Partial<MethodologyLike> = {}): MethodologyLike {
  return {
    id: "m1",
    user_id: "u1",
    status: "approved",
    content: APPROVED_SPEC,
    title: "Método do caso único",
    ...overrides,
  };
}

const PAGE_INPUT = {
  plan: "PLANO APROVADO DO ARTIGO",
  transcript: "ENTREVISTA DO ARTIGO",
  anexos: "",
  number: 3,
};

describe("methodologySpecBlock", () => {
  it("não injeta nada sem metodologia", () => {
    expect(methodologySpecBlock(null)).toBe("");
    expect(methodologySpecBlock(undefined)).toBe("");
  });

  it("não injeta uma metodologia em rascunho", () => {
    expect(methodologySpecBlock(methodology({ status: "draft" }))).toBe("");
  });

  it("não injeta metodologia aprovada sem conteúdo", () => {
    expect(methodologySpecBlock(methodology({ content: null }))).toBe("");
    expect(methodologySpecBlock(methodology({ content: "   " }))).toBe("");
  });

  it("injeta a spec aprovada com o cabeçalho do bloco", () => {
    const block = methodologySpecBlock(methodology());
    expect(block).toContain("METODOLOGIA APROVADA (spec vinculada)");
    expect(block).toContain("Método Pracinha");
  });
});

describe("buildPagePrompt — injeção da metodologia", () => {
  it("sem spec, o prompt é idêntico ao comportamento anterior", () => {
    const plain = buildPagePrompt(PAGE_INPUT);
    expect(buildPagePrompt({ ...PAGE_INPUT, methodologySpec: "" })).toBe(plain);
    expect(buildPagePrompt({ ...PAGE_INPUT, methodologySpec: undefined })).toBe(plain);
    expect(plain).not.toContain("METODOLOGIA APROVADA");
    expect(plain).toContain("PLANO APROVADO");
    expect(plain).toContain("ENTREVISTA");
  });

  it("uma metodologia em rascunho não altera o prompt", () => {
    const plain = buildPagePrompt(PAGE_INPUT);
    const withDraft = buildPagePrompt({
      ...PAGE_INPUT,
      methodologySpec: methodologySpecBlock(methodology({ status: "draft" })),
    });
    expect(withDraft).toBe(plain);
  });

  it("uma metodologia aprovada entra no prompt, depois do plano", () => {
    const prompt = buildPagePrompt({
      ...PAGE_INPUT,
      methodologySpec: methodologySpecBlock(methodology()),
    });
    expect(prompt).toContain("METODOLOGIA APROVADA (spec vinculada)");
    expect(prompt).toContain("Método Pracinha");
    expect(prompt.indexOf("METODOLOGIA APROVADA")).toBeGreaterThan(
      prompt.indexOf("PLANO APROVADO"),
    );
  });
});

describe("methodologyLinkError — vínculo artigo ↔ metodologia", () => {
  it("recusa metodologia inexistente", () => {
    expect(methodologyLinkError(null, "u1")).toBe("Metodologia não encontrada");
  });

  it("recusa metodologia de outro pesquisador", () => {
    expect(methodologyLinkError(methodology({ user_id: "u2" }), "u1")).toBe(
      "Esta metodologia não é sua",
    );
  });

  it("recusa metodologia em rascunho", () => {
    expect(methodologyLinkError(methodology({ status: "draft" }), "u1")).toBe(
      "A metodologia precisa estar aprovada antes de ser vinculada",
    );
  });

  it("aceita metodologia aprovada do mesmo pesquisador", () => {
    expect(methodologyLinkError(methodology(), "u1")).toBeNull();
  });
});

describe("cobertura das sete seções da spec", () => {
  it("reconhece as seções por título de Markdown", () => {
    const coverage = specSectionCoverage(APPROVED_SPEC);
    const present = coverage.filter((c) => c.present).map((c) => c.section);
    expect(present).toContain("Tipo de estudo e justificativa");
    expect(present).toContain("Instrumento analítico");
    expect(present).not.toContain("Limitações");
  });

  it("reconhece seções escritas sem Markdown", () => {
    const coverage = specSectionCoverage(
      "Tipo de estudo: documental. Corpus e fontes: autos. Limitações: caso único.",
    );
    expect(coverage.every((c) => c.present)).toBe(false);
    expect(coverage.find((c) => c.section === "Limitações")?.present).toBe(true);
  });

  it("devolve as sete seções fixas, na ordem", () => {
    const coverage = specSectionCoverage("");
    expect(coverage.map((c) => c.section)).toEqual([...METHODOLOGY_SPEC_SECTIONS]);
    expect(specCoverageRatio("")).toBe(0);
  });
});

describe("identidade do caderno", () => {
  it("gera um código de protocolo estável e legível", () => {
    const code = methodologyProtocolCode("abc123");
    expect(code).toMatch(/^PROT-[0-9A-F]{6}$/);
    expect(methodologyProtocolCode("abc123")).toBe(code);
    expect(methodologyProtocolCode("outro")).not.toBe(code);
  });

  it("usa a semente como título sem inventar método", () => {
    expect(methodologyTitleFromSeed("  Análise   documental  ")).toBe("Análise documental");
    expect(methodologyTitleFromSeed("")).toBe("Metodologia sem título");
    expect(methodologyTitleFromSeed(undefined)).toBe("Metodologia sem título");
  });
});

describe("migration 0007_methodologies.sql", () => {
  const sql = readFileSync(join(process.cwd(), "migrations", "0007_methodologies.sql"), "utf8");

  it("cria as tabelas da metodologia como entidade própria", () => {
    expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists\s+methodologies/i);
    expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists\s+methodology_messages/i);
    expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists\s+methodology_documents/i);
  });

  it("acopla o artigo com vínculo opcional e reversível", () => {
    expect(sql).toMatch(
      /alter\s+table\s+articles\s+add\s+column\s+methodology_id\s+text\s+references\s+methodologies\(id\)\s+on\s+delete\s+set\s+null/i,
    );
  });

  it("apaga mensagens e documentos junto com a metodologia", () => {
    expect(sql).toMatch(
      /methodology_id\s+text\s+not\s+null\s+references\s+methodologies\(id\)\s+on\s+delete\s+cascade/i,
    );
  });
});

describe("cleanInterviewReply", () => {
  it("corta a resposta quando o modelo passa a inventar falas do pesquisador", () => {
    const raw = [
      "Antes de tudo: separar fonte primária de secundária muda o que conta como prova.",
      "",
      "PESQUISADOR: (comprada) Isso pode incluir como as pessoas se sentem.",
      "PESQUISADOR: E também como denunciam as práticas.",
    ].join("\n");
    const out = cleanInterviewReply(raw);
    expect(out).toContain("separar fonte primária de secundária");
    expect(out).not.toContain("PESQUISADOR");
  });

  it("remove o rótulo do assistente no começo da fala", () => {
    expect(cleanInterviewReply("SCIENCECHAT: Qual é o corpus?")).toBe("Qual é o corpus?");
    expect(cleanInterviewReply("[2] assistente: Qual é o corpus?")).toBe("Qual é o corpus?");
  });

  it("mantém intacta uma fala normal e limita o tamanho", () => {
    const normal = "Boa. O corpus já tem cinco fontes primárias. Quais delas provam a data do ato?";
    expect(cleanInterviewReply(normal)).toBe(normal);

    const long = `${"frase de teste. ".repeat(200)}`;
    const out = cleanInterviewReply(long, 200);
    expect(out.length).toBeLessThanOrEqual(201);
  });
});

describe("matchMethodologyReference", () => {
  const eugenia = {
    id: "9ad5c41d-0e66-49ac-baec-b9d471a48f29",
    title: "Estudo de caso instrumental sobre eugenia burocrática",
    status: "approved",
  };
  const documental = {
    id: "1f0b2c33-4d55-4e66-8f77-99aa0bb11cc2",
    title: "Análise documental do ANPP",
    status: "draft",
  };
  const conteudo = {
    id: "2c1d3e44-5f66-4777-9a88-0bb1c22dd33e",
    title: "Análise de conteúdo dos autos",
    status: "approved",
  };
  const rows = [eugenia, documental, conteudo];

  it("casa por trecho do título, sem acento e sem caixa", () => {
    expect(matchMethodologyReference(rows, "a metodologia de eugenia burocratica").match?.id).toBe(
      eugenia.id,
    );
  });

  it("casa pelo código do protocolo que a tela mostra", () => {
    const code = methodologyProtocolCode(eugenia.id);
    expect(matchMethodologyReference(rows, `use a ${code}`).match?.id).toBe(eugenia.id);
  });

  it("não escolhe sozinho quando o trecho é ambíguo", () => {
    const ambiguous = matchMethodologyReference(rows, "analise");
    expect(ambiguous.match).toBeNull();
    expect(ambiguous.candidates.map((c) => c.id)).toEqual([documental.id, conteudo.id]);
  });

  it("devolve vazio quando não existe nada parecido", () => {
    expect(matchMethodologyReference(rows, "etnografia multissituada")).toEqual({
      match: null,
      candidates: [],
    });
  });
});

describe("comando no chat do artigo", () => {
  const tools = readFileSync(join(process.cwd(), "src/lib/ai/tools.server.ts"), "utf8");
  const prompt = readFileSync(join(process.cwd(), "src/lib/ai/prompts.ts"), "utf8");

  it("expõe as ferramentas de metodologia ao chat", () => {
    expect(tools).toContain("usar_metodologia: tool({");
    expect(tools).toContain("listar_metodologias: tool({");
    expect(tools).toContain("setArticleMethodology");
  });

  it("só acopla metodologia aprovada", () => {
    expect(tools).toContain('match.status !== "approved"');
  });

  it("ensina o comando no prompt", () => {
    expect(prompt).toContain("METODOLOGIA REUTILIZÁVEL");
    expect(prompt).toContain("usar_metodologia");
  });
});

describe("parseMethodologyCommand", () => {
  it("lê o nome depois de 'use a metodologia'", () => {
    expect(parseMethodologyCommand("use a metodologia de eugenia burocrática")).toBe(
      "eugenia burocrática",
    );
    expect(parseMethodologyCommand("aplica a metodologia Método Pracinha neste artigo")).toBe(
      "Método Pracinha neste artigo",
    );
  });

  it("aceita variações de verbo e caixa", () => {
    expect(parseMethodologyCommand("Acople a metodologia: análise documental")).toBe(
      "análise documental",
    );
  });

  it("ignora conversa que só menciona metodologia", () => {
    expect(parseMethodologyCommand("minha metodologia é qualitativa, e agora?")).toBeNull();
    expect(parseMethodologyCommand("use a metodologia")).toBeNull();
  });
});

describe("methodologySectionText", () => {
  const page = [
    "## 3. Metodologia",
    "",
    "Estudo de caso instrumental, conforme Stake.",
    "",
    "### Corpus",
    "",
    "Certidões com selo digital.",
    "",
    "## 4. Resultados",
    "",
    "Não deve entrar.",
  ].join("\n");

  it("recorta do título de Metodologia até o próximo título de mesmo nível", () => {
    const section = methodologySectionText(page);
    expect(section).toContain("## 3. Metodologia");
    expect(section).toContain("Certidões com selo digital.");
    expect(section).not.toContain("Resultados");
    expect(section).not.toContain("Não deve entrar");
  });

  it("devolve null quando a página não tem seção de Metodologia", () => {
    expect(methodologySectionText("## 2. Fundamentação teórica\n\nTexto.")).toBeNull();
  });
});

describe("cleanMethodologyReply", () => {
  it("remove a abertura de reconhecimento e a especulação", () => {
    const raw =
      "Entendi que você está trabalhando com um método algébrico. Isso me faz pensar que quer medir desvio. Qual é o corpus do estudo?";
    const clean = cleanMethodologyReply(raw);
    expect(clean.startsWith("Qual é o corpus do estudo?")).toBe(true);
    expect(clean).not.toContain("Entendi");
    expect(clean).not.toContain("Isso me faz pensar");
  });

  it("mantém uma pergunta só", () => {
    const clean = cleanMethodologyReply(
      "O corpus define o peso da prova. Qual é o corpus? E o procedimento?",
    );
    expect(clean).toContain("Qual é o corpus?");
    expect(clean).not.toContain("E o procedimento?");
  });

  it("corta a devolução da fala do pesquisador", () => {
    const raw =
      "Você está considerando esses documentos como fontes primárias, pois são originais. Qual é o procedimento analítico que você seguirá?";
    expect(cleanMethodologyReply(raw)).toBe("Qual é o procedimento analítico que você seguirá?");
  });

  it("mantém o contexto que explica a pergunta", () => {
    const raw =
      "Ainda não está claro como a análise será feita. Você tem um protocolo para decompor as variáveis B?";
    const clean = cleanMethodologyReply(raw);
    expect(clean).toContain("Ainda não está claro");
    expect(clean).toContain("Você tem um protocolo");
  });

  it("limpa uma resposta real recheada de eco", () => {
    const raw =
      "Com essa decomposição, você está separando claramente o fato incontestável do documento (A) das variáveis administrativas (B) que afetam o resultado (D). Isso me faz pensar que você está utilizando uma abordagem estruturada para analisar os dados. Qual é a categoria analítica que você utilizará para organizar e interpretar os resultados da decomposição A→B→D?";
    const clean = cleanMethodologyReply(raw);
    expect(clean).not.toContain("Isso me faz pensar");
    expect(
      clean.endsWith(
        "Qual é a categoria analítica que você utilizará para organizar e interpretar os resultados da decomposição A→B→D?",
      ),
    ).toBe(true);
  });

  it("nunca devolve texto vazio", () => {
    expect(cleanMethodologyReply("Entendi.")).toBe("Entendi.");
  });

  it("preserva a pergunta quando não há abertura de reconhecimento", () => {
    expect(cleanMethodologyReply("Qual é o instrumento analítico?")).toBe(
      "Qual é o instrumento analítico?",
    );
  });
});

describe("splitMethodReply", () => {
  it("separa contexto e pergunta", () => {
    const { context, question } = splitMethodReply(
      "O corpus precisa ser primário. Qual é o corpus que você vai analisar?",
    );
    expect(context).toBe("O corpus precisa ser primário.");
    expect(question).toBe("Qual é o corpus que você vai analisar?");
  });

  it("sem pergunta, tudo é pergunta (nada se perde)", () => {
    expect(splitMethodReply("Anotado.").question).toBe("Anotado.");
  });
});
