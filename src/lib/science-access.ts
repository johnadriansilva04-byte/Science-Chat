/**
 * Conteúdo educativo do card "Ciência sem crachá".
 *
 * Ideia central (verdadeira e verificável): fazer ciência e submeter um artigo a
 * uma revista NÃO exige vínculo institucional, diploma ou orientador. O que
 * qualifica um trabalho é o MÉTODO e a responsabilidade do autor — não a grife
 * da instituição. O ScienceChat reúne aqui, em linguagem direta e com fontes
 * oficiais, o passo a passo de quem publica como pesquisador independente, no
 * Brasil e no Uruguai.
 *
 * Regra editorial: nada aqui é norma inventada. Cada afirmação normativa aponta
 * para uma fonte oficial real (`SCIENCE_REFERENCES`), e a lista de requisitos de
 * cada revista continua sendo do pesquisador — como no resto do produto.
 */

export type ReferenceRegion = "internacional" | "brasil" | "uruguai";

/** Cadastro gratuito do identificador de pesquisador (ORCID). */
export const ORCID_REGISTER_URL = "https://orcid.org/register";

export type ScienceReference = {
  /** Nome curto da fonte. */
  label: string;
  /** URL oficial. */
  url: string;
  /** Por que ela importa para quem publica sem vínculo. */
  note: string;
  region: ReferenceRegion;
};

/**
 * Fontes oficiais. Nenhuma exige vínculo institucional para ser consultada ou
 * usada; várias são as mesmas que revistas e universidades adotam.
 */
export const SCIENCE_REFERENCES: ScienceReference[] = [
  {
    label: "ICMJE — Recommendations",
    url: "https://www.icmje.org/recommendations/",
    note: "Define os 4 critérios de AUTORIA (contribuição, escrita/revisão, aprovação e responsabilidade). Não exige instituição: exige contribuição real.",
    region: "internacional",
  },
  {
    label: "ORCID",
    url: "https://info.orcid.org/what-is-orcid/",
    note: "Identificador único e gratuito do pesquisador. É seu, pessoal, e independe de vínculo — serve para assinar e ser encontrado.",
    region: "internacional",
  },
  {
    label: "SciELO — Sobre",
    url: "https://www.scielo.org/pt-br/sobre-o-scielo/",
    note: "Biblioteca científica de acesso aberto; reúne periódicos avaliados por pares no Brasil e na América Latina.",
    region: "internacional",
  },
  {
    label: "SciELO Preprints",
    url: "https://preprints.scielo.org/",
    note: "Servidor de preprints: você pode tornar público um manuscrito ANTES da revista, sem vínculo institucional, e garantir autoria e data.",
    region: "internacional",
  },
  {
    label: "DOAJ — Guide to applying",
    url: "https://doaj.org/apply/guide/",
    note: "O que uma revista de acesso aberto confiável deve publicar (política de acesso, escopo, corpo editorial, processo de revisão, licenças e taxas). Bom teste para checar se a revista é séria.",
    region: "internacional",
  },
  {
    label: "arXiv — Submissão",
    url: "https://info.arxiv.org/help/submit/index.html",
    note: "Servidor de preprints aberto à submissão; pede endosso por área (de um pesquisador já ativo), não vínculo institucional.",
    region: "internacional",
  },
  {
    label: "PLOS ONE — Critérios de publicação",
    url: "https://journals.plos.org/plosone/s/criteria-for-publication",
    note: "Lista o que a revista avalia: pesquisa original, análise de alto padrão, conclusões sustentadas pelos dados, ética. Nenhum critério é a instituição do autor.",
    region: "internacional",
  },
  {
    label: "ORCID — Criar o seu iD",
    url: ORCID_REGISTER_URL,
    note: "Cadastro gratuito e pessoal do identificador (formato 0000-0000-0000-0000). Em poucos minutos você tem uma identidade de pesquisador permanente, que não depende de nenhuma instituição e é aceita por revistas e universidades.",
    region: "internacional",
  },
  {
    label: "Plataforma Lattes (CNPq)",
    url: "https://lattes.cnpq.br/",
    note: "Currículo público do pesquisador no Brasil. Pode ser criado e mantido por quem não tem vínculo — é o registro da sua trajetória.",
    region: "brasil",
  },
  {
    label: "ABNT",
    url: "https://abnt.org.br/",
    note: "Normas de formatação e citação usadas no Brasil (ex.: NBR 14724 para trabalhos acadêmicos). Padronizar o texto não depende de instituição.",
    region: "brasil",
  },
  {
    label: "Portal de Periódicos da CAPES",
    url: "https://www.periodicos.capes.gov.br/",
    note: "Reúne bases científicas assinadas pelo governo brasileiro. A consulta é feita pelo seu login (inclusive de pesquisador sem vínculo, quando a instituição parceira libera o acesso).",
    region: "brasil",
  },
  {
    label: "Universidad de la República (Udelar)",
    url: "https://udelar.edu.uy/",
    note: "Universidade pública do Uruguai. Referência editorial inicial do ScienceChat: cada unidade tem revistas próprias com instruções aos autores.",
    region: "uruguai",
  },
  {
    label: "Udelar — Apoio a publicações (CSIC)",
    url: "https://investigacion.udelar.edu.uy/apoyo-a-publicaciones/",
    note: "Programa da Udelar que apoia a publicação científica e dá acesso às instruções e aos periódicos da universidade. Serve para localizar a versão oficial das normas de cada revista.",
    region: "uruguai",
  },
  {
    label: "ANII",
    url: "https://www.anii.org.uy/",
    note: "Agência Nacional de Investigación e Innovación (Uruguai). Apoia pesquisa e formação; o financiamento não é pré-requisito para submeter um artigo.",
    region: "uruguai",
  },
];

/** Passo a passo para publicar sem crachá. Cada passo tem um "porquê". */
export type ScienceStep = {
  /** Número do passo (1, 2, 3, …). */
  n: number;
  title: string;
  /** O que fazer, em uma frase direta. */
  do: string;
  /** Por que isso importa (o fundamento). */
  why: string;
};

export const SCIENCE_STEPS: ScienceStep[] = [
  {
    n: 1,
    title: "Entenda: ciência é método, não clube",
    do: "Trate a ciência como um jeito rigoroso de perguntar e provar — não como um clube com porteiro.",
    why: "Um artigo é aceito ou recusado pelo que ele demonstra e por como demonstra. A instituição ajuda, mas não é a credencial que valida o argumento.",
  },
  {
    n: 2,
    title: "Garanta o método e a responsabilidade",
    do: "Tenha uma pergunta clara, evidência de verdade e honestidade sobre limites.",
    why: "O ICMJE define autoria por 4 critérios — contribuição, escrita/revisão, aprovação da versão final e responsabilidade — e nenhum deles exige vínculo institucional.",
  },
  {
    n: 3,
    title: "Assine como pesquisador (ORCID)",
    do: "Crie um ORCID gratuito e use-o na submissão e no rodapé do artigo.",
    why: "O ORCID é um identificador único e SEU: distingue você de homônimos e fixa sua autoria, com ou sem instituição. É aceito pelas revistas e universidades.",
  },
  {
    n: 4,
    title: "Escolha a revista pelo escopo, não pela grife",
    do: "Procure revistas cujo tema bate com o seu e leia as “instruções aos autores”.",
    why: "A chance de aceite depende do encaixe com a revista. O DOAJ lista o que uma revista séria deve publicar — use como teste de confiabilidade.",
  },
  {
    n: 5,
    title: "Siga as diretrizes oficiais da revista",
    do: "Formate o texto exatamente como a revista pede (norma, tamanho, estrutura).",
    why: "A revista é dona das próprias regras. Conferir a versão oficial evita recusa por detalhe de forma. O ScienceChat registra as diretrizes que você colar.",
  },
  {
    n: 6,
    title: "Preencha a afiliação como puder",
    do: "Se não tiver vínculo, escreva “Pesquisador(a) independente” — é legítimo.",
    why: "Muitas revistas pedem a afiliação, mas ela é descritiva, não um requisito de elegibilidade. A revisão por pares é cega ao seu crachá: julga o texto.",
  },
  {
    n: 7,
    title: "Submeta e passe pela revisão por pares",
    do: "Envie o manuscrito pelo sistema da revista e responda aos pareceres.",
    why: "A revisão por pares é feita pela REVISTA, não por você nem pela plataforma. É ela que dá o selo de qualidade — e está aberta a autores de qualquer origem.",
  },
  {
    n: 8,
    title: "Torne público e registre a autoria",
    do: "Depois do aceite, use o DOI. Antes, se quiser, publique um preprint.",
    why: "Preprint (ex.: SciELO Preprints) garante autoria e data de forma pública e gratuita, sem vínculo. O DOI é a identidade permanente do artigo.",
  },
  {
    n: 9,
    title: "Brasil: registre a trajetória",
    do: "Mantenha o currículo Lattes e use as normas da ABNT; consulte o Portal de Periódicos da CAPES.",
    why: "O Lattes é público e aceita quem não tem vínculo; a ABNT padroniza seu texto; o Portal da CAPES dá acesso a bases assinadas.",
  },
  {
    n: 10,
    title: "Uruguai: comece pela Udelar",
    do: "Localize a revista na Udelar (veja o apoio a publicações do CSIC) e, se pesquisar lá, veja o apoio da ANII.",
    why: "A Udelar é a referência inicial do ScienceChat; o apoio a publicações reúne os periódicos e as instruções aos autores, e a ANII apoia pesquisa e formação no país.",
  },
];

/** O que NÃO é exigido para submeter um artigo — desfaz o mito do crachá. */
export const NOT_REQUIRED: string[] = [
  "Vínculo com universidade ou laboratório",
  "Diploma de doutorado ou mestrado",
  "Orientador ou coautor acadêmico",
  "Financiamento de agência de fomento",
  "Crachá, matrícula ou carteirinha institucional",
];

/** O que realmente conta — o que a revista e os pares avaliam. */
export const WHAT_COUNTS: string[] = [
  "Uma pergunta clara e um método explícito",
  "Evidência verificável e honestidade sobre os limites",
  "Aderência ao escopo e às normas da revista",
  "Referências reais (nunca inventadas)",
  "Responsabilidade sobre tudo o que está publicado",
];

/**
 * A resposta direta à pergunta "dá para publicar sem ser de instituição?".
 * Cada afirmação aponta para uma prova verificável (`proof` + fonte oficial).
 */
export type DirectAnswerPoint = {
  /** Afirmação, em uma frase. */
  claim: string;
  /** A prova concreta (o que a fonte diz). */
  proof: string;
  /** Fonte oficial da prova. */
  source: string;
  /** URL da fonte. */
  url: string;
};

export const DIRECT_ANSWER_POINTS: DirectAnswerPoint[] = [
  {
    claim: "Sim: o critério de AUTORIA não menciona instituição.",
    proof:
      "O ICMJE define autoria por 4 critérios: contribuição substancial; escrever ou revisar criticamente; aprovar a versão final; e responsabilizar-se pelo trabalho. Nenhum deles é vínculo institucional, diploma ou cargo.",
    source: "ICMJE",
    url: "https://www.icmje.org/recommendations/",
  },
  {
    claim: "Sim: as revistas avaliam o TEXTO, não o seu crachá.",
    proof:
      "Os critérios de publicação do PLOS ONE são: pesquisa original, análise de alto padrão, conclusões sustentadas pelos dados, ética e aderência às normas. A instituição do autor não aparece na lista.",
    source: "PLOS ONE — Criteria for Publication",
    url: "https://journals.plos.org/plosone/s/criteria-for-publication",
  },
  {
    claim: "Sim: você tem identidade de pesquisador sem vínculo.",
    proof:
      "O ORCID é um identificador único, persistente e gratuito para pesquisadores. Você mesmo cria, de graça, em minutos (orcid.org/register) — sem instituição. O número tem o formato 0000-0000-0000-0000, é permanente e distingue você de homônimos. É aceito por revistas e universidades.",
    source: "ORCID",
    url: "https://info.orcid.org/what-is-orcid/",
  },
  {
    claim: "Sim: dá para publicar antes da revista, sem vínculo.",
    proof:
      "No SciELO Preprints e no arXiv você torna público um manuscrito antes da revista — o arXiv pede endosso de um pesquisador já ativo, não vínculo institucional — e garante autoria e data.",
    source: "SciELO Preprints / arXiv",
    url: "https://preprints.scielo.org/",
  },
  {
    claim: "Sim: a revisão por pares é da revista, não sua.",
    proof:
      "É a REVISTA que conduz a avaliação por pares; ela julga o mérito do trabalho. Por isso a origem do autor é irrelevante para o veredito.",
    source: "DOAJ — Guide to applying",
    url: "https://doaj.org/apply/guide/",
  },
];

/** Países cobertos, com o nome do que orientar em cada um. */
export type CountryPath = {
  id: "brasil" | "uruguai";
  label: string;
  highlights: string[];
};

export const COUNTRY_PATHS: CountryPath[] = [
  {
    id: "brasil",
    label: "Brasil",
    highlights: [
      "Currículo Lattes (CNPq): registro público, aberto a quem não tem vínculo.",
      "Normas ABNT para formatação e citações (ex.: NBR 14724).",
      "SciELO: periódicos de acesso aberto avaliados por pares.",
      "Portal de Periódicos da CAPES: acesso a bases assinadas.",
    ],
  },
  {
    id: "uruguai",
    label: "Uruguai",
    highlights: [
      "Udelar: referência inicial do ScienceChat; cada unidade tem revistas.",
      "Udelar — Apoio a publicações (CSIC): onde ficam os periódicos e as instruções aos autores.",
      "ANII: apoio à pesquisa e à formação (não é pré-requisito para submeter).",
      "SciELO e SciELO Preprints: publicação e preprints em acesso aberto.",
    ],
  },
];

/** Fonte única de verdade: o passo a passo completo, para reuso e teste. */
export function scienceAccessSteps(): ScienceStep[] {
  return SCIENCE_STEPS;
}

/**
 * Carta de apresentação (cover letter) pronta para preencher.
 *
 * Muitas revistas pedem, junto com o manuscrito, uma carta ao editor. Não é
 * exigência de vínculo: é um documento de autoria. Os campos entre [ ] são do
 * pesquisador; a afiliação já vem resolvida como "Pesquisador(a) independente",
 * que é legítima. Cada declaração corresponde ao que o ICMJE pede do autor.
 */
export const COVER_LETTER_TEMPLATE = `Ao(À) editor(a)-chefe da revista [NOME DA REVISTA]

Assunto: Submissão de artigo original — [TÍTULO DO ARTIGO]

Prezado(a) Editor(a),

Submeto, para avaliação, o manuscrito intitulado "[TÍTULO DO ARTIGO]", de minha
autoria, para possível publicação em [NOME DA REVISTA].

O trabalho investiga [TEMA/OBJETIVO EM UMA FRASE] e se alinha ao escopo da revista
porque [POR QUE ESTA REVISTA: tema, seção, público].

Declaro que:
- o manuscrito é original e não foi publicado anteriormente;
- não está sob avaliação em nenhum outro periódico;
- todos os autores aprovaram a versão submetida e concordam com a submissão;
- não há conflito de interesses a declarar;
- o estudo seguiu as normas éticas aplicáveis [e foi aprovado pelo comitê de ética
  quando cabível — nº do parecer: ____].

Afiliação: Pesquisador(a) independente (sem vínculo institucional).

Fico à disposição para esclarecimentos e agradeço a atenção.

Atenciosamente,
[NOME COMPLETO]
ORCID: [0000-0000-0000-0000]
E-mail: [SEU E-MAIL]
[CIDADE, PAÍS] — [DATA]`;

/** Referências filtradas por região (para abas/seções do card). */
export function referencesByRegion(region: ReferenceRegion): ScienceReference[] {
  return SCIENCE_REFERENCES.filter((r) => r.region === region);
}
