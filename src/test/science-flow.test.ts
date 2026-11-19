import { describe, expect, it } from "vitest";
import {
  SCIENCE_BITES,
  SCIENCE_BITES_TOTAL,
  SCIENCE_FLOW_DONE,
  SCIENCE_FLOW_IDLE,
  advanceScienceFlow,
  currentScienceBite,
  detectScienceDoubt,
  dismissScienceFlow,
  wasScienceFlowDismissed,
  isLastScienceBite,
  scienceFlowCounter,
  scienceFlowNextLabel,
  startScienceFlow,
} from "@/lib/science-flow";

describe("detectScienceDoubt", () => {
  it("reconhece quem diz que não tem instituição", () => {
    expect(detectScienceDoubt("Não tenho instituição. Posso publicar mesmo assim?")).toBe(true);
    expect(detectScienceDoubt("sou independente, sem vínculo com universidade")).toBe(true);
    expect(detectScienceDoubt("não me formei, dá pra submeter artigo?")).toBe(true);
    expect(detectScienceDoubt("preciso de diploma para publicar em revista?")).toBe(true);
  });

  it("reconhece a persona do fluxo", () => {
    expect(detectScienceDoubt("quero publicar como pesquisador independente")).toBe(true);
  });

  it("não dispara em menção de passagem à instituição", () => {
    expect(detectScienceDoubt("meu orientador da Udelar disse que o tema é bom")).toBe(false);
    expect(detectScienceDoubt("estudei na universidade em 2019")).toBe(false);
  });

  it("não confunde dúvida autoral com falta de credencial", () => {
    // "não tenho certeza do título" é dúvida sobre o artigo, não sobre vínculo.
    expect(detectScienceDoubt("não tenho certeza do título ainda")).toBe(false);
    expect(detectScienceDoubt("não tenho os dados ainda, vou coletar entrevistas")).toBe(false);
    expect(detectScienceDoubt("sem dados não dá, né? vou coletar")).toBe(false);
  });

  it("não dispara em texto vazio ou sem relação", () => {
    expect(detectScienceDoubt("")).toBe(false);
    expect(detectScienceDoubt("quero falar sobre futebol")).toBe(false);
  });
});

describe("fluxo picado", () => {
  it("começa no primeiro bocado, não no fim", () => {
    const state = startScienceFlow();
    expect(state.stage).toBe("running");
    expect(currentScienceBite(state)?.n).toBe(1);
  });

  it("avança UM bocado por vez", () => {
    let state = startScienceFlow();
    state = advanceScienceFlow(state);
    expect(currentScienceBite(state)?.n).toBe(2);
    state = advanceScienceFlow(state);
    expect(currentScienceBite(state)?.n).toBe(3);
  });

  it("só termina depois do último bocado", () => {
    let state = startScienceFlow();
    for (let i = 0; i < SCIENCE_BITES_TOTAL; i++) {
      expect(state.stage).toBe("running");
      state = advanceScienceFlow(state);
    }
    expect(state.stage).toBe("finished");
    expect(currentScienceBite(state)).toBeNull();
  });

  it("não anda para trás nem estoura o índice", () => {
    let state = startScienceFlow();
    for (let i = 0; i < SCIENCE_BITES_TOTAL + 5; i++) state = advanceScienceFlow(state);
    expect(state.stage).toBe("finished");
    expect(advanceScienceFlow(state)).toEqual(state);
  });

  it("não avança fora do estágio running", () => {
    expect(advanceScienceFlow(SCIENCE_FLOW_IDLE)).toEqual(SCIENCE_FLOW_IDLE);
  });

  it("marca o último bocado para trocar o rótulo do botão", () => {
    let state = startScienceFlow();
    for (let i = 0; i < SCIENCE_BITES_TOTAL - 1; i++) state = advanceScienceFlow(state);
    expect(isLastScienceBite(state)).toBe(true);
    expect(scienceFlowNextLabel(state)).toBe("Concluir");
  });

  it("mostra contador humano", () => {
    const state = advanceScienceFlow(startScienceFlow());
    expect(scienceFlowCounter(state)).toBe(`2 de ${SCIENCE_BITES_TOTAL}`);
  });
});

describe("conteúdo dos bocados", () => {
  it("cada bocado ensina o quê, o porquê e o para-que-serve", () => {
    for (const bite of SCIENCE_BITES) {
      expect(bite.title.trim().length).toBeGreaterThan(0);
      expect(bite.what.trim().length).toBeGreaterThan(0);
      expect(bite.why.trim().length).toBeGreaterThan(0);
      expect(bite.whatFor.trim().length).toBeGreaterThan(0);
    }
  });

  it("é curto o bastante para ser lido no celular", () => {
    // Um bocado que passa de ~340 caracteres já virou textão no chat.
    for (const bite of SCIENCE_BITES) {
      expect(bite.why.length).toBeLessThan(340);
      expect(bite.whatFor.length).toBeLessThan(340);
    }
  });

  it("numera em sequência, sem buracos", () => {
    SCIENCE_BITES.forEach((bite, i) => expect(bite.n).toBe(i + 1));
  });

  it("cobre o fundamento, o ORCID, a revista e a afiliação", () => {
    const all = SCIENCE_BITES.map((b) => `${b.title} ${b.what} ${b.why}`).join(" ");
    expect(all).toMatch(/ICMJE/);
    expect(all).toMatch(/ORCID/);
    expect(all).toMatch(/escopo/i);
    expect(all).toMatch(/Pesquisador\(a\) independente/);
  });

  it("não promete vínculo nem apoio institucional", () => {
    const all = SCIENCE_BITES.map((b) => `${b.title} ${b.what} ${b.why} ${b.whatFor}`).join(" ");
    expect(all).not.toMatch(/apoio a publicaç/i);
    expect(all).not.toMatch(/gratuit[oa] para docente/i);
  });

  it("fecha convidando a criar, sem sermão", () => {
    expect(SCIENCE_FLOW_DONE.length).toBeLessThan(140);
    expect(SCIENCE_FLOW_DONE).toMatch(/escrever/i);
  });
});

describe("recusa sobrevive à recarga", () => {
  const makeStore = () => {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
    };
  };

  it("começa não dispensado", () => {
    expect(wasScienceFlowDismissed("art-1", makeStore())).toBe(false);
  });

  it("lembra a recusa por artigo", () => {
    const store = makeStore();
    dismissScienceFlow("art-1", store);
    expect(wasScienceFlowDismissed("art-1", store)).toBe(true);
    // Não vaza para outro artigo: cada um tem o seu convite.
    expect(wasScienceFlowDismissed("art-2", store)).toBe(false);
  });

  it("não duplica nem cresce sem limite", () => {
    const store = makeStore();
    dismissScienceFlow("art-1", store);
    dismissScienceFlow("art-1", store);
    for (let i = 0; i < 40; i++) dismissScienceFlow(`art-${i}`, store);
    const raw = store.getItem("sciencechat.ciencia-sem-cracha.dismissed") ?? "[]";
    expect(JSON.parse(raw).length).toBeLessThanOrEqual(20);
  });

  it("aguenta storage corrompido sem quebrar o chat", () => {
    const store = { getItem: () => "{isso não é json", setItem: () => {} };
    expect(wasScienceFlowDismissed("art-1", store)).toBe(false);
    expect(() => dismissScienceFlow("art-1", store)).not.toThrow();
  });

  it("sem storage (SSR) não explode", () => {
    expect(wasScienceFlowDismissed("art-1", undefined as never)).toBe(false);
  });
});
