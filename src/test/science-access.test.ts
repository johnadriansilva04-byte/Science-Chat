import { describe, expect, it } from "vitest";
import {
  COUNTRY_PATHS,
  COVER_LETTER_TEMPLATE,
  DIRECT_ANSWER_POINTS,
  NOT_REQUIRED,
  SCIENCE_REFERENCES,
  SCIENCE_STEPS,
  WHAT_COUNTS,
  referencesByRegion,
  scienceAccessSteps,
} from "@/lib/science-access";

describe("scienceAccessSteps", () => {
  it("numera os passos de 1 a N, em ordem", () => {
    const steps = scienceAccessSteps();
    expect(steps.length).toBeGreaterThanOrEqual(8);
    steps.forEach((s, i) => expect(s.n).toBe(i + 1));
  });

  it("cada passo tem o que fazer e o porquê", () => {
    for (const s of SCIENCE_STEPS) {
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.do.length).toBeGreaterThan(10);
      expect(s.why.length).toBeGreaterThan(10);
    }
  });

  it("cobre o Brasil e o Uruguai", () => {
    const all = SCIENCE_STEPS.map((s) => `${s.title} ${s.do} ${s.why}`).join(" ");
    expect(all).toMatch(/Lattes/);
    expect(all).toMatch(/ABNT/);
    expect(all).toMatch(/SciELO Uruguay/);
    expect(all).toMatch(/CVUy/);
    expect(all).toMatch(/ANII/);
  });

  // Quem publica sem vínculo é o alvo preferido das revistas predatórias: sem
  // orientador nem instituição, ninguém avisa que a "revista" só quer a taxa.
  it("avisa sobre revista predatória e taxa (APC)", () => {
    const all = SCIENCE_STEPS.map((s) => `${s.title} ${s.do} ${s.why} ${s.whatFor ?? ""}`).join(
      " ",
    );
    expect(all).toMatch(/predat/i);
    expect(all).toMatch(/taxa|APC/i);
    expect(SCIENCE_REFERENCES.some((r) => /thinkchecksubmit\.org/.test(r.url))).toBe(true);
  });

  it("não promete apoio institucional a quem não tem vínculo", () => {
    // O "Apoyo a publicaciones" da Udelar é para LIVROS e exige cargo docente
    // orçamentado: não serve de caminho para pesquisador independente.
    const all = [
      ...SCIENCE_STEPS.map((s) => `${s.title} ${s.do} ${s.why}`),
      ...COUNTRY_PATHS.flatMap((c) => c.highlights),
      ...SCIENCE_REFERENCES.map((r) => `${r.label} ${r.note}`),
    ].join(" ");
    expect(all).not.toMatch(/apoio a publicaç/i);
    // E o acesso restrito da CAPES é dito com clareza.
    expect(all).toMatch(/CAFe|IP/);
  });
});

describe("ciência sem crachá", () => {
  it("lista o que NÃO é exigido para submeter", () => {
    expect(NOT_REQUIRED.join(" ")).toMatch(/Vínculo/i);
    expect(NOT_REQUIRED.join(" ")).toMatch(/Diploma/i);
    expect(NOT_REQUIRED.length).toBeGreaterThanOrEqual(4);
  });

  it("lista o que realmente conta", () => {
    expect(WHAT_COUNTS.join(" ")).toMatch(/método/i);
    expect(WHAT_COUNTS.length).toBeGreaterThanOrEqual(4);
  });

  it("oferece caminhos para Brasil e Uruguai", () => {
    const ids = COUNTRY_PATHS.map((c) => c.id);
    expect(ids).toEqual(["brasil", "uruguai"]);
    for (const c of COUNTRY_PATHS) expect(c.highlights.length).toBeGreaterThanOrEqual(3);
  });
});

describe("SCIENCE_REFERENCES", () => {
  it("usa apenas URLs oficiais (https) e únicas", () => {
    const urls = SCIENCE_REFERENCES.map((r) => r.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(url.startsWith("https://")).toBe(true);
  });

  it("filtra por região", () => {
    expect(referencesByRegion("brasil").every((r) => r.region === "brasil")).toBe(true);
    expect(referencesByRegion("uruguai").length).toBeGreaterThanOrEqual(2);
    expect(referencesByRegion("internacional").length).toBeGreaterThanOrEqual(3);
  });

  it("inclui as fontes-chave citadas no card", () => {
    const urls = SCIENCE_REFERENCES.map((r) => r.url).join(" ");
    expect(urls).toMatch(/icmje\.org/);
    expect(urls).toMatch(/orcid\.org/);
    expect(urls).toMatch(/scielo\.org/);
    expect(urls).toMatch(/doaj\.org/);
    expect(urls).toMatch(/lattes\.cnpq\.br/);
    expect(urls).toMatch(/udelar\.edu\.uy/);
    expect(urls).toMatch(/anii\.org\.uy/);
    expect(urls).toMatch(/cvuy\.uy/);
    expect(urls).toMatch(/scielo\.edu\.uy/);
  });

  it("cada referência explica por que importa", () => {
    for (const r of SCIENCE_REFERENCES) {
      expect(r.label.length).toBeGreaterThan(2);
      expect(r.note.length).toBeGreaterThan(20);
    }
  });
});

describe("DIRECT_ANSWER_POINTS", () => {
  it("cada dúvida tem resposta curta, prova e fonte oficial", () => {
    expect(DIRECT_ANSWER_POINTS.length).toBeGreaterThanOrEqual(4);
    for (const p of DIRECT_ANSWER_POINTS) {
      expect(p.question.trim().endsWith("?")).toBe(true);
      expect(p.answer.length).toBeGreaterThan(10);
      expect(p.proof.length).toBeGreaterThan(40);
      expect(p.source.length).toBeGreaterThan(2);
      expect(p.url.startsWith("https://")).toBe(true);
    }
  });

  // O bloco "Posso publicar sem vínculo?" chegou a abrir cinco itens seguidos
  // com "Sim:" — virou eco, não resposta. Cada item é uma dúvida própria.
  it("não repete o mesmo começo em todas as respostas", () => {
    const openers = DIRECT_ANSWER_POINTS.map((p) => p.answer.slice(0, 3).toLowerCase());
    expect(new Set(openers).size).toBe(DIRECT_ANSWER_POINTS.length);
    expect(
      DIRECT_ANSWER_POINTS.filter((p) => /^Sim[: ]/i.test(p.answer)).length,
    ).toBeLessThanOrEqual(1);
  });

  it("não repete a mesma pergunta", () => {
    const questions = DIRECT_ANSWER_POINTS.map((p) => p.question.toLowerCase());
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("cobre ICMJE, PLOS e ORCID como provas", () => {
    const urls = DIRECT_ANSWER_POINTS.map((p) => p.url).join(" ");
    expect(urls).toMatch(/icmje\.org/);
    expect(urls).toMatch(/plos\.org/);
    expect(urls).toMatch(/orcid\.org/);
  });

  // A prova da revisão por pares citava o guia do DOAJ, que não fala de quem
  // conduz a revisão. A fonte correta é o próprio ICMJE.
  it("fundamenta a revisão por pares no ICMJE, não no DOAJ", () => {
    const review = DIRECT_ANSWER_POINTS.find((p) => /revisão por pares/i.test(p.question));
    expect(review?.url).toMatch(/icmje\.org/);
    expect(review?.proof).toMatch(/pareceristas|revisores|peer/i);
  });

  it("a prova do ICMJE cita os 4 critérios de autoria", () => {
    const icmje = DIRECT_ANSWER_POINTS.find((p) => /icmje/i.test(p.source));
    expect(icmje?.proof).toMatch(/4 critérios|quatro critérios/i);
    expect(icmje?.proof).toMatch(/responsabiliz|responsabilid/i);
  });
});

describe("COVER_LETTER_TEMPLATE", () => {
  it("é uma carta ao editor pronta para preencher", () => {
    expect(COVER_LETTER_TEMPLATE).toMatch(/editor/i);
    expect(COVER_LETTER_TEMPLATE).toMatch(/\[NOME DA REVISTA\]/);
    expect(COVER_LETTER_TEMPLATE).toMatch(/\[TÍTULO DO ARTIGO\]/);
  });

  it("resolve a afiliação como pesquisador independente", () => {
    expect(COVER_LETTER_TEMPLATE).toMatch(/Pesquisador\(a\) independente/);
  });

  it("declara originalidade e ausência de submissão simultânea", () => {
    expect(COVER_LETTER_TEMPLATE).toMatch(/original/i);
    expect(COVER_LETTER_TEMPLATE).toMatch(/outro periódico|não está sob avaliação/i);
    expect(COVER_LETTER_TEMPLATE).toMatch(/conflito de interesses/i);
  });

  it("pede o ORCID do autor", () => {
    expect(COVER_LETTER_TEMPLATE).toMatch(/ORCID/);
  });
});
