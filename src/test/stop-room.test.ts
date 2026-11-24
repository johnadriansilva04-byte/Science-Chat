import { describe, expect, it } from "vitest";

import {
  ROOM_CODE_ALPHABET,
  ROOM_POINTS,
  ROOM_TOTAL_ROUNDS,
  STOP_ROOM_LIMITS,
  drawRandomConfig,
  drawRoundLetter,
  isSpectatorOfRound,
  normalizeAnswer,
  roomMatchOver,
  settleRoomRound,
  validateRoomFields,
  fieldsFromCategoryIds,
  hostActionError,
  makeRoomCode,
  normalizeRoomCode,
  playerName,
  rankPlayers,
  roomCodeValid,
  roomSecondsLeft,
  validateRoundConfig,
} from "@/lib/stop-room";

describe("código da sala", () => {
  it("gera seis caracteres sem letras ambíguas", () => {
    const code = makeRoomCode();
    expect(code).toHaveLength(6);
    expect([...code].every((char) => ROOM_CODE_ALPHABET.includes(char))).toBe(true);
    expect(code).not.toMatch(/[IO01]/);
  });

  it("é determinístico com um gerador fixo", () => {
    const fixed = () => 0;
    expect(makeRoomCode(fixed)).toBe("AAAAAA");
  });

  it("normaliza o que a pessoa digita", () => {
    expect(normalizeRoomCode(" ab-c12 3 ")).toBe("ABC123");
    expect(normalizeRoomCode("çabc")).toBe("CABC");
  });

  it("só aceita código com seis caracteres do alfabeto", () => {
    expect(roomCodeValid("ABC234")).toBe(true);
    expect(roomCodeValid("ABC23")).toBe(false);
    expect(roomCodeValid("ABC2O4")).toBe(false);
    expect(roomCodeValid("ABC214")).toBe(false);
  });
});

describe("sorteio da rodada", () => {
  it("traz seis perguntas distintas e letra válida", () => {
    const config = drawRandomConfig();
    expect(config.fields).toHaveLength(6);
    expect(new Set(config.fields.map((field) => field.label)).size).toBe(6);
    expect(config.letter).toMatch(/^[A-Z]$/);
    expect(config.seconds).toBe(90);
    expect(config.auto).toBe(true);
  });

  it("não repete pergunta entre sorteios com o mesmo gerador zero", () => {
    const config = drawRandomConfig(() => 0);
    expect(new Set(config.fields.map((field) => field.label)).size).toBe(6);
  });
});

describe("perguntas escolhidas a dedo", () => {
  const base = {
    letter: "M",
    seconds: 90,
    fields: [
      { label: "Nome", hint: "Nome próprio" },
      { label: "Cidade", hint: "Cidade ou capital" },
      { label: "Animal", hint: "" },
    ],
  };

  it("aceita catálogo + perguntas escritas pelo anfitrião", () => {
    const result = validateRoundConfig({
      ...base,
      fields: [...base.fields, { label: "Música que começa com…", hint: "Escrita pelo anfitrião" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.fields).toHaveLength(4);
    expect(result.config.auto).toBe(false);
  });

  it("recusa letra inválida e tempo fora da faixa", () => {
    expect(validateRoundConfig({ ...base, letter: "MM" }).ok).toBe(false);
    expect(validateRoundConfig({ ...base, letter: "" }).ok).toBe(false);
    expect(validateRoundConfig({ ...base, seconds: 10 }).ok).toBe(false);
    expect(validateRoundConfig({ ...base, seconds: 999 }).ok).toBe(false);
  });

  it("exige de 3 a 8 perguntas", () => {
    expect(validateRoundConfig({ ...base, fields: base.fields.slice(0, 2) }).ok).toBe(false);
    const many = Array.from({ length: STOP_ROOM_LIMITS.maxFields + 1 }, (_, index) => ({
      label: `Pergunta ${index}`,
      hint: "",
    }));
    expect(validateRoundConfig({ ...base, fields: many }).ok).toBe(false);
  });

  it("recusa pergunta repetida e rótulo curto", () => {
    const repeated = [...base.fields, { label: "nome", hint: "" }];
    expect(validateRoundConfig({ ...base, fields: repeated }).ok).toBe(false);
    expect(
      validateRoundConfig({ ...base, fields: [{ label: "a", hint: "" }, ...base.fields] }).ok,
    ).toBe(false);
  });

  it("corta rótulo e dica no limite em vez de estourar", () => {
    const result = validateRoundConfig({
      ...base,
      fields: [{ label: "L".repeat(80), hint: "H".repeat(120) }, base.fields[1], base.fields[2]],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.fields[0]!.label).toHaveLength(STOP_ROOM_LIMITS.labelMax);
    expect(result.config.fields[0]!.hint).toHaveLength(STOP_ROOM_LIMITS.hintMax);
  });

  it("monta campos a partir de ids do catálogo", () => {
    const fields = fieldsFromCategoryIds(["nome", "time"]);
    expect(fields[1]).toEqual({ label: "Time", hint: "Clube de futebol" });
  });
});

describe("ranking e tempo da sala", () => {
  const base = { roundScore: null as number | null, submitted: true };

  it("ordena por total e desempata pela rodada", () => {
    const players = [
      { name: "Ana", total: 120, roundScore: 40, submitted: true },
      { name: "Bia", total: 160, roundScore: 30, submitted: true },
      { name: "Caio", total: 120, roundScore: 55, submitted: true },
    ];
    expect(rankPlayers(players).map((player) => player.name)).toEqual(["Bia", "Caio", "Ana"]);
  });

  it("quem entregou fica à frente de quem não entregou", () => {
    const players = [
      { name: "Zé", total: 0, roundScore: 0, submitted: false },
      { name: "Ivo", total: 0, roundScore: 0, submitted: true },
    ];
    expect(rankPlayers(players)[0]!.name).toBe("Ivo");
  });

  it("conta os segundos restantes sem ficar negativo", () => {
    const inTen = new Date(Date.now() + 10_000).toISOString();
    const past = new Date(Date.now() - 5_000).toISOString();
    expect(roomSecondsLeft(inTen)).toBeGreaterThan(5);
    expect(roomSecondsLeft(past)).toBe(0);
    expect(roomSecondsLeft(null)).toBe(0);
  });

  it(`mantém o apelido curto e cai no padrão quando vazio`, () => {
    expect(playerName("  Ana   Maria ")).toBe("Ana Maria");
    expect(playerName("")).toBe("Pesquisador");
    expect(playerName("x".repeat(40))).toHaveLength(24);
  });
});

describe("quem manda na sala", () => {
  const base = { isHost: true, status: "lobby" as const, roundClosed: false };

  it("bloqueia quem não é anfitrião", () => {
    expect(hostActionError({ ...base, isHost: false, action: "start" })).toContain("quem criou");
  });

  it("não deixa mexer no meio de uma rodada aberta", () => {
    expect(hostActionError({ ...base, status: "playing", action: "configure" })).toContain(
      "Espere a rodada",
    );
    expect(hostActionError({ ...base, status: "playing", action: "start" })).toContain(
      "ainda está correndo",
    );
  });

  it("libera depois que a rodada fecha e bloqueia sala encerrada", () => {
    expect(
      hostActionError({ ...base, status: "playing", roundClosed: true, action: "start" }),
    ).toBeNull();
    expect(hostActionError({ ...base, status: "finished", action: "start" })).toContain(
      "já foi encerrada",
    );
  });
});

describe("letra sorteada pelo sistema", () => {
  it("nunca repete uma letra já usada na partida", () => {
    const used = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    for (let attempt = 0; attempt < 40; attempt += 1) {
      expect(used).not.toContain(drawRoundLetter(used));
    }
  });

  it("sorteia dez letras diferentes numa partida de dez rodadas", () => {
    const used: string[] = [];
    for (let round = 0; round < ROOM_TOTAL_ROUNDS; round += 1) {
      const letter = drawRoundLetter(used);
      expect(used).not.toContain(letter);
      used.push(letter);
    }
    expect(new Set(used).size).toBe(ROOM_TOTAL_ROUNDS);
  });
});

describe("placar do Stop (10 pontos, 5 se repetir)", () => {
  const verdict = (valid: boolean) => [{ valid }, { valid }, { valid }];

  it("resposta válida e inédita vale 10", () => {
    const [ana] = settleRoomRound([
      { userId: "ana", answers: ["Manaus", "Macaco", "Mônica"], verdicts: verdict(true) },
    ]);
    expect(ana?.fields).toEqual([10, 10, 10]);
    expect(ana?.total).toBe(30);
  });

  it("palavra repetida vale 5 para os dois lados", () => {
    const settled = settleRoomRound([
      { userId: "ana", answers: ["Manaus", "Macaco", "Mônica"], verdicts: verdict(true) },
      { userId: "bia", answers: ["manaus", "Mico", "Mônica"], verdicts: verdict(true) },
    ]);
    expect(settled[0]?.fields).toEqual([ROOM_POINTS.duplicate, 10, ROOM_POINTS.duplicate]);
    expect(settled[1]?.fields).toEqual([ROOM_POINTS.duplicate, 10, ROOM_POINTS.duplicate]);
    expect(settled[0]?.total).toBe(20);
  });

  it("ignora acento e caixa ao comparar repetidas", () => {
    expect(normalizeAnswer("  Mônica ")).toBe("monica");
    const settled = settleRoomRound([
      { userId: "ana", answers: ["Mônica"], verdicts: verdict(true) },
      { userId: "bia", answers: ["MONICA"], verdicts: verdict(true) },
    ]);
    expect(settled[1]?.fields[0]).toBe(ROOM_POINTS.duplicate);
  });

  it("resposta inválida ou em branco não pontua", () => {
    const settled = settleRoomRound([
      {
        userId: "ana",
        answers: ["Manaus", "", "Mônica"],
        verdicts: [{ valid: true }, { valid: false }, { valid: false }],
      },
    ]);
    expect(settled[0]?.fields).toEqual([10, 0, 0]);
  });
});

describe("partida de dez rodadas", () => {
  it("termina exatamente na décima", () => {
    expect(roomMatchOver(9)).toBe(false);
    expect(roomMatchOver(10)).toBe(true);
    expect(ROOM_TOTAL_ROUNDS).toBe(10);
  });

  it("quem entra no meio só assiste até a próxima rodada", () => {
    expect(isSpectatorOfRound(3, 3)).toBe(true);
    expect(isSpectatorOfRound(3, 4)).toBe(false);
    expect(isSpectatorOfRound(0, 1)).toBe(false);
  });
});

describe("perguntas sem letra (a letra vem do sistema)", () => {
  const fields = [
    { label: "Nome", hint: "" },
    { label: "Cidade", hint: "" },
    { label: "Animal", hint: "" },
  ];

  it("aceita de três a oito perguntas", () => {
    const ok = validateRoomFields({ seconds: 90, fields });
    expect(ok.ok).toBe(true);
  });

  it("recusa rodada com poucas perguntas", () => {
    const bad = validateRoomFields({ seconds: 90, fields: fields.slice(0, 2) });
    expect(bad.ok).toBe(false);
  });
});
