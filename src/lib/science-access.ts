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
    note: "Servidor de preprints: você pode tornar público um manuscrito ANTES da revista, sem vínculo institucional, e garantir autoria e data. Basta registrar-se com ORCID. A postagem é automática para quem já tem 3 artigos com DOI ativo (ou 2 dos últimos 2 anos); os demais passam por uma triagem básica.",
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
    note: "Servidor de preprints aberto à submissão. Quem submete pela primeira vez precisa de endosso por área — de um pesquisador já ativo — ou de um e-mail institucional; nenhum dos dois é exigência de vínculo formal.",
    region: "internacional",
  },
  {
    label: "PLOS ONE — Critérios de publicação",
    url: "https://journals.plos.org/plosone/s/criteria-for-publication",
    note: "Lista o que a revista avalia: pesquisa original, análise de alto padrão, conclusões sustentadas pelos dados, ética. Nenhum critério é a instituição do autor.",
    region: "internacional",
  },
  {
    label: "Think. Check. Submit. — Revistas confiáveis",
    url: "https://thinkchecksubmit.org/journals/",
    note: "Checklist internacional (COPE, DOAJ, OASPA, ISSN, STM) para saber se uma revista é séria antes de submeter. Quem publica sem vínculo é o alvo preferido das revistas predatórias: elas cobram taxa e não revisam nada. Responda as perguntas da lista antes de enviar qualquer texto.",
    region: "internacional",
  },
  // Índices regionais: são o caminho para "outros países" sem inventar um
  // passo a passo por país. Os dois cobrem Brasil e Uruguai e o resto da
  // América Latina, e servem como teste de seriedade da revista.
  {
    label: "Latindex",
    url: "https://www.latindex.org/latindex/inicio",
    note: "Sistema regional de informação para revistas científicas da América Latina, Caribe, Espanha e Portugal. O catálogo mostra se a revista é indexada e cumpre critérios editoriais — vale para o Brasil, o Uruguai e os países vizinhos, sem exigir vínculo de quem consulta.",
    region: "internacional",
  },
  {
    label: "Redalyc",
    url: "https://www.redalyc.org/",
    note: "Rede de revistas científicas ibero-americanas em acesso aberto. Serve para ler e para conferir se a revista de destino é indexada — e é uma alternativa de leitura quando o Portal da CAPES não abre para quem não tem vínculo.",
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
    note: "Bases científicas assinadas pelo governo brasileiro. O acesso é liberado pelo reconhecimento de IP ou pela conta CAFe de uma instituição participante — por isso nem sempre está aberto a quem não tem vínculo. Publicar não depende dele: os artigos abertos do SciELO e os preprints cobrem boa parte do que você precisa ler.",
    region: "brasil",
  },
  {
    label: "Universidad de la República (Udelar)",
    url: "https://udelar.edu.uy/",
    note: "Universidade pública do Uruguai. Referência editorial inicial do ScienceChat: cada unidade tem revistas próprias com instruções aos autores.",
    region: "uruguai",
  },
  {
    label: "SciELO Uruguay",
    url: "https://www.scielo.edu.uy/",
    note: "Coleção uruguaia do SciELO, hospedada na BINAME–CENDIM da Faculdade de Medicina da Udelar. Reúne revistas científicas do país com acesso aberto e revisão por pares — é onde você confere escopo, normas e prazos de cada revista antes de submeter.",
    region: "uruguai",
  },
  {
    label: "CVUy (ANII)",
    url: "https://cvuy.uy/",
    note: "Currículo único uruguaio, mantido pela ANII — o equivalente ao Lattes no Uruguai. É gratuito e aberto a quem não tem vínculo. Não é pré-requisito para submeter um artigo: serve para você ter um currículo público consultável por instituições e empresas do país.",
    region: "uruguai",
  },
  {
    label: "Colibri (Udelar)",
    url: "https://www.colibri.udelar.edu.uy/",
    note: "Repositório institucional da Udelar: teses e produção científica, aberto para leitura. O depósito é para quem tem vínculo com a universidade — para publicar sem vínculo, use um preprint (SciELO Preprints) ou a revista de acesso aberto.",
    region: "uruguai",
  },
  {
    label: "ANII",
    url: "https://www.anii.org.uy/",
    note: "Agência Nacional de Investigación e Innovación (Uruguai). Apoia pesquisa e formação; o financiamento não é pré-requisito para submeter um artigo.",
    region: "uruguai",
  },
];

/** Passo a passo para publicar sem crachá. Cada passo tem um "porquê" e a fonte. */
export type ScienceStep = {
  /** Número do passo (1, 2, 3, …). */
  n: number;
  title: string;
  /** O que fazer, em uma frase direta. */
  do: string;
  /** Por que isso importa (o fundamento). */
  why: string;
  /** Para que serve, na prática (opcional). */
  whatFor?: string;
  /**
   * Documento oficial que sustenta a etapa. Sem isto o card seria opinião: a
   * regra editorial é que cada afirmação normativa abra na fonte primária.
   */
  source?: { label: string; url: string };
  /** Onde a etapa vale de forma explícita (para o selo Brasil/Uruguai). */
  region?: "brasil" | "uruguai";
};

export const SCIENCE_STEPS: ScienceStep[] = [
  {
    n: 1,
    title: "Entenda: ciência é método, não clube",
    do: "Trate a ciência como um jeito rigoroso de perguntar e provar — não como um clube com porteiro.",
    why: "Um artigo é aceito ou recusado pelo que ele demonstra e por como demonstra. A instituição ajuda, mas não é a credencial que valida o argumento.",
    source: { label: "ICMJE — Recommendations", url: "https://www.icmje.org/recommendations/" },
  },
  {
    n: 2,
    title: "Garanta o método e a responsabilidade",
    do: "Tenha uma pergunta clara, evidência de verdade e honestidade sobre limites.",
    why: "O ICMJE define autoria por 4 critérios — contribuição, escrita/revisão, aprovação da versão final e responsabilidade — e nenhum deles exige vínculo institucional.",
    source: {
      label: "ICMJE — critérios de autoria",
      url: "https://www.icmje.org/recommendations/browse/roles-and-responsibilities/defining-the-role-of-authors-and-contributors.html",
    },
  },
  {
    n: 3,
    title: "Resolva a ética — o único ponto que pode exigir instituição",
    do: "Se a pesquisa envolve seres humanos, submeta o projeto a um Comitê de Ética em Pesquisa (CEP) ANTES de coletar dados.",
    why: "No Brasil, a Resolução CNS nº 466/2012 exige aprovação por CEP para pesquisa com seres humanos, e o CEP é um colegiado criado por uma instituição. Sem vínculo, você submete pelo CEP de uma instituição que aceite ser a proponente do projeto. Não é um crachá seu: é o comitê avaliando o projeto e o consentimento — e a exigência vale igual para quem tem vínculo. Pesquisa teórica, bibliográfica ou com dados públicos não passa por CEP.",
    whatFor:
      "Serve para você não descobrir isso depois de já ter entrevistado alguém: sem parecer do CEP, a revista recusa o artigo e os dados não podem ser usados.",
    source: {
      label: "CONEP — Comissão Nacional de Ética em Pesquisa (CNS)",
      url: "https://conselho.saude.gov.br/comissoes-cns/conep/",
    },
  },
  {
    n: 4,
    title: "Assine como pesquisador (ORCID)",
    do: "Crie um ORCID gratuito e use-o na submissão e no rodapé do artigo.",
    why: "O ORCID é um identificador único e SEU: distingue você de homônimos e fixa sua autoria, com ou sem instituição. É aceito pelas revistas e universidades.",
    source: { label: "ORCID — criar o iD", url: "https://orcid.org/register" },
  },
  {
    n: 5,
    title: "Escolha a revista pelo escopo, não pela grife",
    do: "Procure revistas cujo tema bate com o seu e leia as “instruções aos autores”.",
    why: "A chance de aceite depende do encaixe com a revista. O DOAJ lista o que uma revista séria deve publicar — use como teste de confiabilidade.",
    source: { label: "DOAJ — Guide to applying", url: "https://doaj.org/apply/guide/" },
  },
  {
    n: 6,
    title: "Siga as diretrizes oficiais da revista",
    do: "Formate o texto exatamente como a revista pede (norma, tamanho, estrutura).",
    why: "A revista é dona das próprias regras. Conferir a versão oficial evita recusa por detalhe de forma. O ScienceChat registra as diretrizes que você colar.",
    source: {
      label: "SciELO — modelo de publicação",
      url: "https://www.scielo.org/pt-br/sobre-o-scielo/programa-scielo-modelo-scielo-de-publicacao-e-rede-scielo/",
    },
  },
  {
    n: 7,
    title: "Preencha a afiliação com honestidade",
    do: "Se não tiver vínculo, declare “Pesquisador(a) independente” e dê um contato verificável (ORCID e e-mail).",
    why: "Muitas revistas pedem o campo “afiliação” — algumas exigem afiliação acadêmica explícita, como a Anales de la Facultad de Medicina (Udelar), que pede afiliação, e-mail e ORCID de cada autor. O que não se pode é INVENTAR vínculo: “Pesquisador(a) independente” é uma afiliação real, usada em artigos publicados e registrada nos metadados do Crossref. Leia as instruções aos autores da revista e preencha o campo como ele é — sem crachá emprestado.",
    source: {
      label: "SciELO Uruguay — Anales de la Facultad de Medicina (instrucciones)",
      url: "https://www.scielo.edu.uy/revistas/afm/iinstruc.htm",
    },
  },
  {
    n: 8,
    title: "Antes de pagar: a revista é séria?",
    do: "Passe a revista pelo checklist do Think. Check. Submit. e desconfie de convite por e-mail com prazo curto e taxa alta.",
    why: "Revista predatória cobra taxa (APC) e não faz revisão de verdade: o artigo é publicado em dias, sem parecerista. Quem publica sem vínculo é o alvo preferido dessas revistas, justamente porque procura uma porta aberta. Revista legítima de acesso aberto também pode cobrar taxa — a diferença é que ela diz o valor antes, tem corpo editorial identificável e processo de revisão declarado.",
    source: { label: "Think. Check. Submit.", url: "https://thinkchecksubmit.org/journals/" },
    whatFor:
      "Serve para você não pagar caro por um selo que não vale nada e não queimar o seu artigo numa publicação que ninguém cita.",
  },
  {
    n: 9,
    title: "Submeta e passe pela revisão por pares",
    do: "Envie o manuscrito pelo sistema da revista e responda aos pareceres.",
    why: "A revisão por pares é feita pela REVISTA, não por você nem pela plataforma. É ela que dá o selo de qualidade — e está aberta a autores de qualquer origem.",
    source: {
      label: "ICMJE — revisão por pares",
      url: "https://www.icmje.org/recommendations/browse/roles-and-responsibilities/responsibilities-in-the-submission-and-peer-peview-process.html",
    },
  },
  {
    n: 10,
    title: "Torne público e registre a autoria",
    do: "Depois do aceite, use o DOI. Antes, se quiser, publique um preprint.",
    why: "Preprint (ex.: SciELO Preprints) garante autoria e data de forma pública e gratuita, sem vínculo. O DOI é a identidade permanente do artigo.",
    source: { label: "SciELO Preprints", url: "https://preprints.scielo.org/" },
  },
  {
    n: 11,
    title: "Brasil: registre a trajetória",
    do: "Mantenha o currículo Lattes, use as normas da ABNT e leia pelo SciELO (aberto).",
    why: "O Lattes é público e aceita quem não tem vínculo; a ABNT padroniza seu texto; o SciELO é aberto e não pede login. O Portal da CAPES só abre por IP ou CAFe de instituição participante — não conte com ele.",
    source: { label: "Plataforma Lattes (CNPq)", url: "https://lattes.cnpq.br/" },
    region: "brasil",
  },
  {
    n: 12,
    title: "Uruguai: SciELO Uruguay, CVUy e ANII",
    do: "Procure a revista no SciELO Uruguay, registre seu currículo no CVUy e, se for o caso, busque as convocatórias da ANII.",
    why: "O SciELO Uruguay reúne as revistas científicas do país com normas e prazos oficiais; o CVUy é o currículo público gratuito e a ANII financia pesquisa — nenhum dos três exige vínculo para você começar.",
    source: { label: "SciELO Uruguay", url: "https://www.scielo.edu.uy/" },
    region: "uruguai",
  },
];

/** O que NÃO é exigido para submeter um artigo — desfaz o mito do crachá. */
export const NOT_REQUIRED: string[] = [
  "Vínculo com universidade ou laboratório",
  "Diploma de doutorado ou mestrado",
  "Orientador ou coautor acadêmico",
];

/** O que realmente conta — o que a revista e os pares avaliam. */
export const WHAT_COUNTS: string[] = [
  "Uma pergunta clara e um método explícito",
  "Evidência verificável e honestidade sobre os limites",
  "Aderência ao escopo e às normas da revista",
];

/**
 * Ressalva honesta sobre o campo "afiliação".
 *
 * "Vínculo" não é exigido, mas o FORMULÁRIO de muitas revistas pede uma
 * afiliação — e algumas (ex.: Anales de la Facultad de Medicina, da Udelar)
 * pedem afiliação acadêmica explícita. Sem esta ressalva o card prometia mais do
 * que a fonte sustenta: quem lesse "não é exigido vínculo" e encontrasse o campo
 * obrigatório poderia inventar instituição — o erro que o card existe para evitar.
 */
export const AFFILIATION_CAVEAT =
  "Atenção ao campo “afiliação”: algumas revistas pedem afiliação acadêmica explícita. Se for o seu caso, declare “Pesquisador(a) independente” — é afiliação real, não vínculo — ou escolha uma revista cujas instruções aceitem autor sem instituição. Nunca invente vínculo.";

/**
 * A única etapa em que a instituição costuma aparecer de verdade: a ÉTICA.
 *
 * O card afirma que publicar não exige vínculo, e isso se sustenta — mas omitir
 * o comitê de ética seria prometer mais do que a norma entrega. No Brasil, a
 * Resolução CNS nº 466/2012 exige que pesquisa com seres humanos seja aprovada
 * por um CEP, e o CEP é um colegiado CRIADO POR UMA INSTITUIÇÃO: quem não tem
 * vínculo submete pelo CEP de uma instituição que aceite ser a proponente (ou
 * por um CEP credenciado que receba projetos externos).
 *
 * Isso não contradiz a ideia central: a ética vale para TODO mundo — inclusive
 * para quem tem crachá — e o que ela exige é projeto e consentimento, não
 * diploma. Mas é uma dependência institucional real e o card precisa dizê-la.
 */
export const ETHICS_CAVEAT =
  "Pesquisa com seres humanos (entrevistas, questionários, dados de pacientes) precisa de aprovação de um Comitê de Ética em Pesquisa (CEP) antes de começar. O CEP é criado por uma instituição — então, nesse caso, você submete pelo CEP de uma instituição que aceite ser a proponente do seu projeto. É a única etapa em que a instituição aparece de fato; e ela vale igual para quem tem crachá: o que o comitê avalia é o projeto e o consentimento, não o seu diploma. Pesquisa teórica, bibliográfica ou com dados públicos não passa por CEP.";

/** Fontes oficiais do requisito de ética (Brasil). */
export const ETHICS_SOURCES: { label: string; url: string }[] = [
  {
    label: "CONEP — Comissão Nacional de Ética em Pesquisa (CNS)",
    url: "https://conselho.saude.gov.br/comissoes-cns/conep/",
  },
  { label: "Plataforma Brasil — submissão a CEP", url: "https://plataformabrasil.saude.gov.br/" },
];

/**
 * As dúvidas reais de quem publica sem vínculo, cada uma com resposta curta e
 * prova verificável (`proof` + fonte oficial).
 *
 * A ordem é a das perguntas que aparecem primeiro na vida do pesquisador: "quem
 * pode assinar?", "a revista olha minha instituição?", "e a revisão, quem faz?".
 */
export type DirectAnswerPoint = {
  /** A dúvida, na forma em que a pessoa pergunta. */
  question: string;
  /** A resposta curta, em uma frase — sem repetir "sim" em todas. */
  answer: string;
  /** A prova concreta (o que a fonte diz). */
  proof: string;
  /** Fonte oficial da prova. */
  source: string;
  /** URL da fonte. */
  url: string;
  /** Ação imediata, para a dúvida que se resolve com um clique (ex.: criar ORCID). */
  cta?: { label: string; url: string };
  /** Merece destaque: é o primeiro passo concreto de quem não tem vínculo. */
  featured?: boolean;
};

export const DIRECT_ANSWER_POINTS: DirectAnswerPoint[] = [
  {
    question: "Preciso de universidade para assinar um artigo?",
    answer: "Não. Autoria se define pelo que você fez e assinou, não pelo lugar onde trabalha.",
    proof:
      "O ICMJE define autoria por 4 critérios: contribuição substancial; escrever ou revisar criticamente; aprovar a versão final; e responsabilizar-se pelo trabalho. Nenhum deles é vínculo institucional, diploma ou cargo.",
    source: "ICMJE — Recommendations",
    url: "https://www.icmje.org/recommendations/",
  },
  {
    question: "A revista avalia a minha instituição ou o meu texto?",
    answer: "O texto. A afiliação é um dado de identificação, não um critério de aceite.",
    proof:
      "Os critérios de publicação do PLOS ONE são: pesquisa original, análise de alto padrão, conclusões sustentadas pelos dados, ética e aderência às normas. A instituição do autor não aparece na lista. O campo de afiliação serve para identificar o autor — e “Pesquisador(a) independente” é uma resposta legítima.",
    source: "PLOS ONE — Criteria for Publication",
    url: "https://journals.plos.org/plosone/s/criteria-for-publication",
  },
  {
    question: "Existe identidade de pesquisador sem vínculo?",
    answer: "Existe: o ORCID, gratuito, pessoal e permanente.",
    proof:
      "O ORCID é um identificador único, persistente e gratuito para pesquisadores. Você mesmo cria, de graça, em minutos (orcid.org/register) — sem instituição. O número tem o formato 0000-0000-0000-0000, é permanente e distingue você de homônimos. É aceito por revistas e universidades.",
    source: "ORCID",
    url: "https://info.orcid.org/what-is-orcid/",
    cta: { label: "Criar meu ORCID (grátis)", url: ORCID_REGISTER_URL },
    featured: true,
  },
  {
    question: "Dá para tornar o trabalho público antes da revista?",
    answer: "Dá: preprint público, com autoria e data, sem pedir vínculo.",
    proof:
      "No SciELO Preprints e no arXiv você torna público um manuscrito antes da revista e garante autoria e data, sem vínculo institucional. Cada um tem a sua porta: no SciELO Preprints a postagem é automática para quem já tem 3 artigos com DOI ativo (ou 2 dos últimos 2 anos) e passa por triagem básica nos demais casos; no arXiv, o primeiro envio exige endosso — um pesquisador já ativo na área, ou um e-mail institucional que acelere o processo. Nos dois, o ORCID é o que assina a autoria.",
    source: "SciELO Preprints / arXiv",
    url: "https://preprints.scielo.org/",
  },
  {
    question: "Quem conduz a revisão por pares: eu ou a revista?",
    answer: "A revista. Você escreve e responde aos pareceres; ela seleciona quem avalia e decide.",
    proof:
      "O ICMJE trata a revisão por pares como responsabilidade da revista: ela garante que existam sistemas para escolher pareceristas adequados, que eles tenham acesso a todo o material e que o processo seja descrito de forma transparente. Ao autor cabe responder às solicitações.",
    source: "ICMJE — Submissão e revisão por pares",
    url: "https://www.icmje.org/recommendations/browse/roles-and-responsibilities/responsibilities-in-the-submission-and-peer-peview-process.html",
  },
];

/**
 * Ressalva honesta das listas "não é exigido": são a regra geral das revistas,
 * não uma garantia. Chamadas específicas e editais podem pedir vínculo.
 */
export const NOT_REQUIRED_CAVEAT =
  "Regra geral das revistas. Confira as instruções aos autores: chamadas específicas e editais de fomento podem pedir vínculo.";

/** Países cobertos, com o nome do que orientar em cada um. */
export type CountryPath = {
  id: "brasil" | "uruguai" | "latam";
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
      "SciELO: periódicos de acesso aberto avaliados por pares — leia e publique sem login.",
      "SciELO Preprints: deixe o manuscrito público antes da revista, com autoria e data.",
    ],
  },
  {
    id: "uruguai",
    label: "Uruguai",
    highlights: [
      "SciELO Uruguay: as revistas científicas do país, com normas e prazos oficiais.",
      "CVUy (ANII): currículo público gratuito — o “Lattes” uruguaio. Não é pré-requisito para submeter.",
      "Colibri (Udelar): repositório institucional, aberto para leitura; o depósito exige vínculo com a Udelar.",
      "ANII: financia pesquisa e formação; não é pré-requisito para submeter um artigo.",
    ],
  },
  {
    // "E outros": o card não promete um passo a passo por país — os índices
    // regionais fazem esse papel e cobrem toda a América Latina de uma vez.
    id: "latam",
    label: "Outros países da América Latina",
    highlights: [
      "Latindex: catálogo regional de revistas científicas — mostra se a revista é indexada e cumpre critérios editoriais.",
      "Redalyc: rede ibero-americana de revistas em acesso aberto, para ler e conferir a revista de destino.",
      "SciELO (coleções nacionais): Argentina, Chile, Colômbia, México, Peru e outros têm coleção própria, com normas de submissão abertas.",
      "O ORCID e o preprint funcionam igual em qualquer país — a autoria não depende de fronteira nem de vínculo.",
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
