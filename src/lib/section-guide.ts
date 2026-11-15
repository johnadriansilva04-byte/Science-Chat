/**
 * Guia das partes do artigo, usado para o Pracinha ENSINAR em vez de decidir.
 * Cada parte traz o "porquê" (importância, com metáfora/linguagem direta) e um
 * exemplo concreto. É a fonte única de verdade do comportamento de mentoria:
 * alimenta tanto os prompts da IA quanto o painel do plano na interface.
 *
 * Regra central: a IA nunca decide o que é autoral (título, palavras-chave,
 * recorte, tese). Ela dá EXEMPLOS e devolve a escolha para o pesquisador.
 */
export type SectionGuide = {
  /** Chave estável (usada em código). */
  key: string;
  /** Nome da parte, como aparece no documento. */
  title: string;
  /** Por que essa parte existe, em linguagem direta (com metáfora quando ajuda). */
  why: string;
  /** Um exemplo concreto, para tornar palpável. */
  example: string;
};

export const SECTION_GUIDE: SectionGuide[] = [
  {
    key: "titulo",
    title: "Título",
    why: "É a porta de entrada: é o que decide se alguém vai abrir o artigo ou passar direto. O título diz o assunto E o recorte — sem prometer mais do que o texto entrega.",
    example:
      "'Um estudo sobre violência' é o gênero do filme; 'Violência institucional na abordagem policial: um estudo de caso em três cidades' é o SEU filme. O título é seu — eu só mostro modelos, você escolhe.",
  },
  {
    key: "resumo",
    title: "Resumo",
    why: "O resumo é o trailer do artigo, não o filme: em poucas linhas (por volta de 150 a 250 palavras) ele adianta o problema, o método, o resultado e a conclusão. Muita gente lê só isso.",
    example:
      "Comece pelo problema ('A pesquisa investiga X'), siga pelo método ('por meio de Y'), termine pelo achado ('os resultados indicam Z'). Se o resumo não dá para entender sozinho, ele falhou.",
  },
  {
    key: "palavras-chave",
    title: "Palavras-chave",
    why: "São as etiquetas que fazem o artigo ser ENCONTRADO. Não são decoração: é por elas que a busca te acha. Eu não escolho por você — mostro exemplos e você decide.",
    example:
      "Para um artigo sobre violência institucional na abordagem policial, funcionam: 'violência institucional', 'abordagem policial', 'segurança pública'. Não funcionam: 'importante', 'sociedade', 'Brasil'. De 3 a 6 termos, os que um leitor digitaria para te achar.",
  },
  {
    key: "introducao",
    title: "Introdução",
    why: "É um funil: começa largo (o contexto do tema), estreita no problema e termina apontando o objetivo. Ela conduz o leitor do 'sobre o que é isso' até 'o que exatamente você vai responder'.",
    example:
      "Contexto (a produção científica é mediada por instituições) → problema (isso exclui quem está fora) → objetivo (desenvolver uma plataforma que reduza essa barreira).",
  },
  {
    key: "fundamentacao",
    title: "Fundamentação teórica",
    why: "Ninguém escreve no vácuo: aqui você conversa com quem já pensou o tema. É onde você mostra de onde vem sua ideia e contra quem (ou a favor de quem) você argumenta.",
    example:
      "Não é uma lista de autores: é um diálogo. 'Durkheim (1897) mostrou X; já Becker (1963) deslocou o olhar para Y — é nessa segunda direção que este trabalho se situa.'",
  },
  {
    key: "metodologia",
    title: "Metodologia",
    why: "É a receita: o que você fez e como fez, detalhado o suficiente para outra pessoa repetir e chegar a algo parecido. Sem receita, não há ciência — só opinião.",
    example:
      "Diga o tipo de pesquisa (teórica, empírica, estudo de caso...), os instrumentos, os critérios de escolha e os limites. 'Foram analisados 12 documentos públicos entre 2015 e 2023, selecionados por...'",
  },
  {
    key: "resultados",
    title: "Resultados",
    why: "Aqui você mostra o que encontrou, sem ainda explicar o significado. É o 'o que os dados dizem', não o 'o que eu acho que isso significa'.",
    example:
      "Apresente tabelas, trechos, números, achados. Guarde a interpretação para a Discussão — misturar os dois é o erro mais comum.",
  },
  {
    key: "discussao",
    title: "Discussão",
    why: "É onde você volta à literatura e explica por que o que encontrou importa: confirma, contradiz ou amplia o que já se sabia. É o coração argumentativo.",
    example:
      "'Os resultados confirmam Silva (2021) no ponto A, mas divergem no ponto B — possivelmente porque...'. Converse com os autores, não fale sozinho.",
  },
  {
    key: "conclusao",
    title: "Conclusão",
    why: "É o fecho: responde ao problema apresentado na introdução e diz o que fica. Não é lugar de trazer resultado novo nem de repetir tudo — é de amarrar.",
    example:
      "Retome a pergunta do início e responda em uma frase, depois aponte contribuição e limites. 'A ciência não é propriedade das instituições' fecha o argumento do começo.",
  },
  {
    key: "referencias",
    title: "Referências",
    why: "Tudo o que você citou, e só o que você citou. Referência é rastro: quem quiser conferir sua afirmação precisa conseguir chegar à fonte.",
    example:
      "Nunca invente uma referência para 'preencher'. Se ainda não tem a fonte, ela vira [REFERÊNCIA A CONFIRMAR] até você achar — e o formato segue a norma da revista.",
  },
];

/** Ordem canônica das partes na montagem do artigo (não obriga a revista). */
export const SECTION_GUIDE_ORDER = SECTION_GUIDE.map((s) => s.key);

/** Rótulo do passo numerado (1, 2, 3, …) de cada parte. */
export function protocolSteps(): { n: number; title: string }[] {
  return SECTION_GUIDE.map((s, i) => ({ n: i + 1, title: s.title }));
}

/**
 * Texto compacto do guia, para embutir nos prompts da IA. Mantém uma só fonte de
 * verdade: se o guia muda, o comportamento da IA muda junto.
 */
export function sectionGuideText(): string {
  return SECTION_GUIDE.map((s) => `- ${s.title} — por quê: ${s.why} Exemplo: ${s.example}`).join(
    "\n",
  );
}

/**
 * Protocolo de produção em passos numerados. O Pracinha apresenta isso ao
 * pesquisador ao fechar a entrevista e segue a ordem (ajustável à revista).
 */
export function protocolText(): string {
  return protocolSteps()
    .map((s) => `${s.n}. ${s.title}`)
    .join("\n");
}
