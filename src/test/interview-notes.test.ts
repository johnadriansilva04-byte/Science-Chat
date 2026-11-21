import { describe, expect, it } from "vitest";

import {
  cleanQuestion,
  collectInterviewNotes,
  interviewNotes,
  isDocumentCommand,
  sectionForAnswer,
  sectionForQuestion,
} from "@/lib/interview-notes";

describe("interviewNotes", () => {
  it("pairs each assistant question with the following user answer", () => {
    const notes = interviewNotes([
      {
        role: "assistant",
        parts: [{ type: "text", text: "Qual é o seu nome?\n\n_Etapa: Autor_" }],
      },
      { role: "user", parts: [{ type: "text", text: "Maria Souza" }] },
      { role: "assistant", parts: [{ type: "text", text: "Sobre o que quer pesquisar?" }] },
      { role: "user", parts: [{ type: "text", text: "IA na educação" }] },
    ]);
    expect(notes.map((n) => ({ question: n.question, answer: n.answer }))).toEqual([
      { question: "Qual é o seu nome?", answer: "Maria Souza" },
      { question: "Sobre o que quer pesquisar?", answer: "IA na educação" },
    ]);
  });

  it("descarta respostas repetidas seguidas (reenvio após falha da IA)", () => {
    const notes = interviewNotes([
      { role: "assistant", parts: [{ type: "text", text: "Qual é a sua tese?" }] },
      { role: "user", parts: [{ type: "text", text: "A ausência de vínculo muda o método." }] },
      { role: "user", parts: [{ type: "text", text: "A ausencia de vinculo muda o metodo" }] },
      { role: "user", parts: [{ type: "text", text: "A AUSÊNCIA de vínculo muda o método!" }] },
    ]);
    expect(notes).toHaveLength(1);
  });

  it("não funde respostas diferentes sobre a mesma pergunta", () => {
    const notes = interviewNotes([
      { role: "assistant", parts: [{ type: "text", text: "Quais evidências você tem?" }] },
      { role: "user", parts: [{ type: "text", text: "Doze documentos públicos de 2015 a 2023." }] },
      {
        role: "user",
        parts: [{ type: "text", text: "Três entrevistas com editores de revista." }],
      },
    ]);
    expect(notes).toHaveLength(2);
  });

  it("classifica a resposta pela pergunta de conteúdo, não pela de ORCID no fim do turno", () => {
    const notes = interviewNotes([
      {
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Para eu fechar o problema: qual é a pergunta central que o artigo quer responder?\n\nAgora, você tem um ORCID?",
          },
        ],
      },
      { role: "user", parts: [{ type: "text", text: "Se a ausência de vínculo muda o método." }] },
    ]);
    expect(notes[0]?.section).toBe("Introdução");
  });

  it("ignores assistant messages that are not questions", () => {
    const notes = interviewNotes([
      { role: "assistant", parts: [{ type: "text", text: "Certo, entendi." }] },
      { role: "user", parts: [{ type: "text", text: "Estudo o sono em estudantes." }] },
    ]);
    expect(notes.map((n) => ({ question: n.question, answer: n.answer }))).toEqual([
      { question: "Informação fornecida", answer: "Estudo o sono em estudantes." },
    ]);
  });

  // Regressão (vista na home real): o texto-semente — o título digitado na home
  // e já exibido como H1 — virava uma seção "Outras informações" na folha com o
  // próprio título repetido dentro dela.
  it("não transforma o texto-semente (antes de qualquer fala) em nota", () => {
    const notes = collectInterviewNotes([
      {
        role: "user",
        parts: [{ type: "text", text: "A ausência de vínculo institucional muda o método" }],
      },
      { role: "assistant", parts: [{ type: "text", text: "Qual é a pergunta central?" }] },
      { role: "user", parts: [{ type: "text", text: "Se o vínculo muda o método." }] },
    ]);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.question).toBe("Qual é a pergunta central?");
  });

  it("não transforma confirmação curta em parágrafo do artigo", () => {
    const notes = interviewNotes([
      { role: "assistant", parts: [{ type: "text", text: "Certo, entendi." }] },
      { role: "user", parts: [{ type: "text", text: "ok" }] },
    ]);
    expect(notes).toHaveLength(0);
  });

  // Regressão (visto no chat real): "Continuar" e "Pular" apareceram como
  // parágrafos das seções do artigo, e a pergunta do próprio pesquisador
  // ("Posso submeter sem vínculo?") virou texto da Introdução.
  it("não mostra pulo, continuação nem pergunta do pesquisador no artigo", () => {
    const messages = [
      { role: "assistant", parts: [{ type: "text", text: "Como você vai demonstrar isso?" }] },
      { role: "user", parts: [{ type: "text", text: "Continuar" }] },
      { role: "assistant", parts: [{ type: "text", text: "Qual é a conclusão?" }] },
      { role: "user", parts: [{ type: "text", text: "Pular" }] },
      { role: "assistant", parts: [{ type: "text", text: "Qual é a sua tese?" }] },
      { role: "user", parts: [{ type: "text", text: "Posso submeter sem vínculo?" }] },
    ];
    expect(interviewNotes(messages)).toHaveLength(0);
    // A entrevista continua sabendo que esses turnos existiram.
    expect(collectInterviewNotes(messages).every((note) => note.skipped)).toBe(true);
  });
});

describe("cleanQuestion", () => {
  it("drops the progress line and keeps the trailing question", () => {
    const q = cleanQuestion("Ótimo! Vamos começar. Qual é a sua área?\n\n_Etapa: Tema_");
    expect(q).toBe("Qual é a sua área?");
  });

  it("preserva o '?' ao truncar uma pergunta longa", () => {
    const long =
      "Sua tese é que a burocracia institucional bloqueia o acesso de pesquisadores " +
      "independentes a periódicos, mas você considerou o papel das redes informais que, " +
      "em muitos casos, funcionam como ponte para quem está fora da academia e publica " +
      "de forma autônoma, sem qualquer vínculo formal?";
    const q = cleanQuestion(long);
    expect(q.endsWith("?")).toBe(true);
    expect(q.length).toBeLessThanOrEqual(300);
  });

  it("pareia pergunta longa com a resposta (não cai em 'Informação fornecida')", () => {
    const long =
      "Você considerou as redes de colaboração informais que, em muitos casos, funcionam " +
      "como ponte para quem está fora da academia e publica de forma autônoma, sem vínculo " +
      "institucional algum, em revistas de acesso aberto e com revisão por pares?";
    const notes = interviewNotes([
      { role: "assistant", parts: [{ type: "text", text: long }] },
      { role: "user", parts: [{ type: "text", text: "Sim, considerei." }] },
    ]);
    expect(notes[0]?.question).not.toBe("Informação fornecida");
    expect(notes[0]?.question.endsWith("?")).toBe(true);
  });

  // Regressão: "arrume o titulo para X" foi gravado três vezes como parágrafo da
  // introdução, porque toda mensagem do usuário virava nota da entrevista.
  it("comando sobre o documento não vira conteúdo do artigo", () => {
    expect(isDocumentCommand("arrume o titulo para O Autodidata e seus Métodos")).toBe(true);
    const notes = interviewNotes([
      { role: "assistant", parts: [{ type: "text", text: "Qual é a sua tese?" }] },
      { role: "user", parts: [{ type: "text", text: "Minha tese é a adaptação cognitiva." }] },
      { role: "user", parts: [{ type: "text", text: "arrume o titulo para O Autodidata" }] },
    ]);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.answer).toBe("Minha tese é a adaptação cognitiva.");
  });

  it("não engole resposta longa de pesquisa", () => {
    expect(
      isDocumentCommand(
        "Estudo de caso exploratório com revisão de literatura sobre funções executivas " +
          "e parentificação, ancorado no certificado do ENCCEJA de 2019 e em relato autobiográfico.",
      ),
    ).toBe(false);
  });
});

describe("sectionForAnswer", () => {
  // Regressão (visto no histórico real): o guard emendou "Fechando: qual é a
  // conclusão…" no fim de um turno que já perguntava sobre a Discussão. O
  // pesquisador respondeu a conclusão e ela foi gravada na Discussão da folha.
  it("a última pergunta do turno vence quando nomeia uma seção", () => {
    const turn =
      "O que muda na área se a sua tese estiver certa — e qual é o limite mais honesto dela?\n\n" +
      "Fechando: qual é a conclusão que você quer que o leitor leve embora?";
    expect(
      sectionForAnswer(
        "Fechando: qual é a conclusão que você quer que o leitor leve embora?",
        turn,
      ),
    ).toBe("Conclusão");
  });

  it("pergunta de identificação no fim do turno não rouba a seção de conteúdo", () => {
    const turn =
      "Para eu fechar o problema: qual é a pergunta central que o artigo quer responder?\n\n" +
      "Agora, você tem um ORCID?";
    expect(sectionForAnswer("Agora, você tem um ORCID?", turn)).toBe("Introdução");
  });
});

describe("sectionForQuestion", () => {
  // Regressão (visto na entrevista real): a pergunta de Discussão diz "se a sua
  // tese estiver certa" e a palavra "tese" a classificava como Introdução. O
  // cabeçalho do chat ficava em "Etapa: Introdução" a entrevista inteira.
  it("pergunta de discussão não cai em Introdução por causa de 'tese'", () => {
    expect(
      sectionForQuestion(
        "O que muda na área se a sua tese estiver certa — e qual é o limite mais honesto dela?",
      ),
    ).toBe("Discussão");
  });

  it("mantém a classificação das perguntas de abertura de cada lacuna", () => {
    expect(sectionForQuestion("Qual é a pergunta central que o artigo quer responder?")).toBe(
      "Introdução",
    );
    expect(sectionForQuestion("Quais autores ou teorias sustentam essa ideia?")).toBe(
      "Fundamentação teórica",
    );
    expect(sectionForQuestion("Como você vai demonstrar isso: quais procedimentos vai usar?")).toBe(
      "Metodologia",
    );
    expect(sectionForQuestion("O que você já tem de resultado concreto?")).toBe("Resultados");
    expect(sectionForQuestion("Qual é a conclusão que você quer que o leitor leve embora?")).toBe(
      "Conclusão",
    );
  });

  // Regressão (visto no chat real): o turno que apenas apresenta o retorno da
  // busca ("O que o resultado da busca diz sobre…?") era classificado como
  // Resultados. A entrevista pulava Introdução e Metodologia e o cabeçalho
  // anunciava "Etapa: Resultados" no primeiro turno.
  it("retorno da busca não vira a seção Resultados", () => {
    expect(sectionForQuestion("O que o resultado da busca diz sobre o efeito da luz azul?")).toBe(
      "Outras informações",
    );
    expect(sectionForQuestion("O que os resultados das bases públicas sugerem?")).toBe(
      "Outras informações",
    );
    expect(sectionForQuestion("O que os achados da literatura mostram?")).toBe(
      "Outras informações",
    );
  });

  it("continua classificando resultados do estudo como Resultados", () => {
    expect(sectionForQuestion("O que você já tem de resultado concreto?")).toBe("Resultados");
    expect(sectionForQuestion("Quais foram os resultados do seu experimento?")).toBe("Resultados");
  });
});
