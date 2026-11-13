/**
 * Museu de Artigos Científicos — acervo curado de obras que mudaram o mundo.
 *
 * Integridade acima de tudo: cada obra aqui tem DOI, autoria, ano e veículo
 * REAIS, verificados em Crossref/OpenAlex. Nada é inventado. As notas ("por que
 * importa") e os títulos traduzidos são descrição própria da ScienceChat — não
 * reproduzimos o texto das obras. O museu existe para dar acesso à fonte
 * primária: cada placa aponta para o artigo original.
 */
export type MuseumWingId = "revolucao" | "poder" | "mente";

export type MuseumWing = {
  id: MuseumWingId;
  label: string;
  subtitle: string;
};

export const MUSEUM_WINGS: MuseumWing[] = [
  {
    id: "revolucao",
    label: "Revolucionaram a humanidade",
    subtitle: "Os artigos que reescreveram o que era possível pensar.",
  },
  {
    id: "poder",
    label: "Poder, burocracia e violência institucional",
    subtitle: "A ciência que mostra como estruturas excluem, obedecem e punem.",
  },
  {
    id: "mente",
    label: "Psicologia e metacognição",
    subtitle: "Como pensamos, erramos e nos enganamos — e como isso nos governa.",
  },
];

export type MuseumWork = {
  id: string;
  /** Título original, como registrado na fonte. */
  title: string;
  /** Tradução livre do título, em pt-BR (descrição própria). */
  titlePt: string;
  authors: string;
  year: number;
  venue: string;
  doi: string;
  wing: MuseumWingId;
  /** Por que esta obra importa — uma frase, escrita pela ScienceChat. */
  note: string;
  tags: string[];
};

export const MUSEUM_WORKS: MuseumWork[] = [
  // ── Ala: Revolucionaram a humanidade ─────────────────────────────────────
  {
    id: "einstein-1905-eletrodinamica",
    title: "Zur Elektrodynamik bewegter Körper",
    titlePt: "Sobre a eletrodinâmica dos corpos em movimento",
    authors: "Einstein, A.",
    year: 1905,
    venue: "Annalen der Physik",
    doi: "10.1002/andp.19053221004",
    wing: "revolucao",
    note: "Fundou a relatividade especial e derrubou o tempo absoluto de Newton.",
    tags: ["relatividade", "física", "espaço-tempo"],
  },
  {
    id: "einstein-1905-quanta",
    title:
      "Über einen die Erzeugung und Verwandlung des Lichtes betreffenden heuristischen Gesichtspunkt",
    titlePt: "Sobre um ponto de vista heurístico relativo à produção e transformação da luz",
    authors: "Einstein, A.",
    year: 1905,
    venue: "Annalen der Physik",
    doi: "10.1002/andp.19053220607",
    wing: "revolucao",
    note: "Propôs o quantum de luz e abriu a física quântica.",
    tags: ["quanta", "física", "luz"],
  },
  {
    id: "einstein-1905-mc2",
    title: "Ist die Trägheit eines Körpers von seinem Energieinhalt abhängig?",
    titlePt: "A inércia de um corpo depende de seu conteúdo de energia?",
    authors: "Einstein, A.",
    year: 1905,
    venue: "Annalen der Physik",
    doi: "10.1002/andp.19053231314",
    wing: "revolucao",
    note: "A origem de E = mc²: massa e energia são a mesma coisa.",
    tags: ["energia", "massa", "física"],
  },
  {
    id: "darwin-wallace-1858",
    title:
      "On the Tendency of Species to form Varieties; and on the Perpetuation of Varieties and Species by Natural Means of Selection",
    titlePt:
      "Sobre a tendência das espécies a formar variedades e a perpetuação de variedades e espécies por meios naturais de seleção",
    authors: "Darwin, Charles; Wallace, Alfred",
    year: 1858,
    venue: "Journal of the Proceedings of the Linnean Society: Zoology",
    doi: "10.1111/j.1096-3642.1858.tb02500.x",
    wing: "revolucao",
    note: "O primeiro anúncio público da seleção natural — a vida tem história.",
    tags: ["evolução", "seleção natural", "biologia"],
  },
  {
    id: "watson-crick-1953",
    title: "Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid",
    titlePt:
      "Estrutura molecular dos ácidos nucleicos: uma estrutura para o ácido desoxirribonucleico",
    authors: "Watson, J. D.; Crick, F. H. C.",
    year: 1953,
    venue: "Nature",
    doi: "10.1038/171737a0",
    wing: "revolucao",
    note: "A dupla hélice do DNA — o código que a vida usa para se copiar.",
    tags: ["DNA", "genética", "biologia"],
  },
  {
    id: "turing-1937-computable",
    title: "On Computable Numbers, with an Application to the Entscheidungsproblem",
    titlePt: "Sobre números computáveis, com uma aplicação ao problema da decisão",
    authors: "Turing, A. M.",
    year: 1937,
    venue: "Proceedings of the London Mathematical Society",
    doi: "10.1112/plms/s2-42.1.230",
    wing: "revolucao",
    note: "Inventou a máquina de Turing: o conceito que fundou a computação.",
    tags: ["computação", "lógica", "matemática"],
  },
  {
    id: "turing-1950-inteligencia",
    title: "Computing Machinery and Intelligence",
    titlePt: "Máquinas de computar e inteligência",
    authors: "Turing, A. M.",
    year: 1950,
    venue: "Mind",
    doi: "10.1093/mind/LIX.236.433",
    wing: "revolucao",
    note: "Propôs o teste de Turing: a pergunta 'máquinas podem pensar?' vira ciência.",
    tags: ["inteligência artificial", "computação", "mente"],
  },
  {
    id: "shannon-1948",
    title: "A Mathematical Theory of Communication",
    titlePt: "Uma teoria matemática da comunicação",
    authors: "Shannon, C. E.",
    year: 1948,
    venue: "Bell System Technical Journal",
    doi: "10.1002/j.1538-7305.1948.tb01338.x",
    wing: "revolucao",
    note: "Nasceu a teoria da informação — o bit, a entropia, o mundo digital.",
    tags: ["informação", "comunicação", "matemática"],
  },

  // ── Ala: Poder, burocracia e violência institucional ─────────────────────
  {
    id: "merton-1940-burocracia",
    title: "Bureaucratic Structure and Personality",
    titlePt: "Estrutura burocrática e personalidade",
    authors: "Merton, R. K.",
    year: 1940,
    venue: "Social Forces",
    doi: "10.2307/2570634",
    wing: "poder",
    note: "Mostrou como a regra burocrática vira fim em si mesma e expulsa quem não se encaixa.",
    tags: ["burocracia", "poder", "sociologia"],
  },
  {
    id: "merton-1957-prioridades",
    title: "Priorities in Scientific Discovery: A Chapter in the Sociology of Science",
    titlePt: "Prioridades na descoberta científica: um capítulo da sociologia da ciência",
    authors: "Merton, R. K.",
    year: 1957,
    venue: "American Sociological Review",
    doi: "10.2307/2089193",
    wing: "poder",
    note: "Expôs como a ciência premia a prioridade e o prestígio, não só a verdade.",
    tags: ["ciência", "reconhecimento", "sociologia"],
  },
  {
    id: "merton-1968-mateus",
    title: "The Matthew Effect in Science",
    titlePt: "O efeito Mateus na ciência",
    authors: "Merton, R. K.",
    year: 1968,
    venue: "Science",
    doi: "10.1126/science.159.3810.56",
    wing: "poder",
    note: "Aos que já têm, mais será dado: o crédito científico se concentra nos famosos.",
    tags: ["desigualdade", "ciência", "crédito"],
  },
  {
    id: "milgram-1963-obediencia",
    title: "Behavioral Study of Obedience",
    titlePt: "Estudo comportamental da obediência",
    authors: "Milgram, Stanley",
    year: 1963,
    venue: "The Journal of Abnormal and Social Psychology",
    doi: "10.1037/h0040525",
    wing: "poder",
    note: "Pessoas comuns aplicam castigos sob autoridade — a obediência vence a consciência.",
    tags: ["obediência", "autoridade", "psicologia social"],
  },
  {
    id: "haney-banks-zimbardo-1972",
    title: "Interpersonal Dynamics in a Simulated Prison",
    titlePt: "Dinâmicas interpessoais numa prisão simulada",
    authors: "Haney, Craig; Banks, Curtis; Zimbardo, Philip",
    year: 1972,
    venue: "Naval Research Technical Report",
    doi: "10.21236/ad0751041",
    wing: "poder",
    note: "O experimento da prisão de Stanford: o papel institucional corrompe quem o ocupa.",
    tags: ["prisão", "violência institucional", "psicologia social"],
  },
  {
    id: "galtung-1969-violencia",
    title: "Violence, Peace, and Peace Research",
    titlePt: "Violência, paz e pesquisa pela paz",
    authors: "Galtung, Johan",
    year: 1969,
    venue: "Journal of Peace Research",
    doi: "10.1177/002234336900600301",
    wing: "poder",
    note: "Formulou a violência estrutural: a que não tem autor, mas mata todo dia.",
    tags: ["violência estrutural", "paz", "poder"],
  },
  {
    id: "pager-2003-criminal-record",
    title: "The Mark of a Criminal Record",
    titlePt: "A marca do antecedente criminal",
    authors: "Pager, Devah",
    year: 2003,
    venue: "American Journal of Sociology",
    doi: "10.1086/374403",
    wing: "poder",
    note: "Mediu a exclusão no mercado de trabalho: o antecedente fecha mais portas que a raça.",
    tags: ["exclusão", "trabalho", "racismo"],
  },
  {
    id: "bertrand-mullainathan-2003",
    title:
      "Are Emily and Greg More Employable than Lakisha and Jamal? A Field Experiment on Labor Market Discrimination",
    titlePt:
      "Emily e Greg são mais empregáveis que Lakisha e Jamal? Um experimento de campo sobre discriminação no trabalho",
    authors: "Bertrand, Marianne; Mullainathan, Sendhil",
    year: 2003,
    venue: "NBER Working Paper (American Economic Review)",
    doi: "10.3386/w9873",
    wing: "poder",
    note: "Mesmo currículo, nomes diferentes: a discriminação medida em ligações de retorno.",
    tags: ["discriminação", "trabalho", "experimento de campo"],
  },
  {
    id: "bourdieu-1986-capital",
    title: "The Forms of Capital",
    titlePt: "As formas do capital",
    authors: "Bourdieu, Pierre",
    year: 1986,
    venue: "Handbook of Theory and Research for the Sociology of Education",
    doi: "10.4324/9780429494338-6",
    wing: "poder",
    note: "Além do dinheiro: capital cultural e social decidem quem entra e quem fica fora.",
    tags: ["capital cultural", "desigualdade", "educação"],
  },
  {
    id: "santos-2015-epistemologias",
    title: "Epistemologies of the South: Justice against Epistemicide",
    titlePt: "Epistemologias do Sul: justiça contra o epistemicídio",
    authors: "Santos, Boaventura de Sousa",
    year: 2015,
    venue: "Routledge",
    doi: "10.4324/9781315634876",
    wing: "poder",
    note: "O Sul também produz conhecimento — a ciência hegemônica apaga outras formas de saber.",
    tags: ["epistemologia", "colonialidade", "justiça"],
  },
  {
    id: "bowles-gintis-2002",
    title: "Schooling in Capitalist America Revisited",
    titlePt: "A escolarização na América capitalista, revisitada",
    authors: "Bowles, Samuel; Gintis, Herbert",
    year: 2002,
    venue: "Sociology of Education",
    doi: "10.2307/3090251",
    wing: "poder",
    note: "A escola não só ensina: ela reproduz a hierarquia social que diz corrigir.",
    tags: ["educação", "reprodução social", "desigualdade"],
  },

  // ── Ala: Psicologia e metacognição ───────────────────────────────────────
  {
    id: "flavell-1979-metacognicao",
    title: "Metacognition and cognitive monitoring: A new area of cognitive–developmental inquiry",
    titlePt: "Metacognição e monitoramento cognitivo: uma nova área de investigação",
    authors: "Flavell, John H.",
    year: 1979,
    venue: "American Psychologist",
    doi: "10.1037/0003-066X.34.10.906",
    wing: "mente",
    note: "Fundou a metacognição: pensar sobre o próprio pensar, e saber o que não sabe.",
    tags: ["metacognição", "cognição", "aprendizagem"],
  },
  {
    id: "kruger-dunning-1999",
    title:
      "Unskilled and unaware of it: How difficulties in recognizing one's own incompetence lead to inflated self-assessments",
    titlePt:
      "Incompetentes e sem perceber: como a dificuldade de reconhecer a própria incompetência infla a autoavaliação",
    authors: "Kruger, Justin; Dunning, David",
    year: 1999,
    venue: "Journal of Personality and Social Psychology",
    doi: "10.1037/0022-3514.77.6.1121",
    wing: "mente",
    note: "O efeito Dunning-Kruger: quem não sabe, não sabe que não sabe.",
    tags: ["metacognição", "autoavaliação", "vieses"],
  },
  {
    id: "tversky-kahneman-1974",
    title: "Judgment under Uncertainty: Heuristics and Biases",
    titlePt: "Julgamento sob incerteza: heurísticas e vieses",
    authors: "Tversky, Amos; Kahneman, Daniel",
    year: 1974,
    venue: "Science",
    doi: "10.1126/science.185.4157.1124",
    wing: "mente",
    note: "A mente usa atalhos que erram de forma previsível — nasceu a economia comportamental.",
    tags: ["heurísticas", "vieses", "decisão"],
  },
  {
    id: "kahneman-tversky-1979",
    title: "Prospect Theory: An Analysis of Decision under Risk",
    titlePt: "Teoria da perspectiva: uma análise da decisão sob risco",
    authors: "Kahneman, Daniel; Tversky, Amos",
    year: 1979,
    venue: "Econometrica",
    doi: "10.2307/1914185",
    wing: "mente",
    note: "Perder dói mais do que ganhar alegra — e isso reescreveu a teoria econômica.",
    tags: ["risco", "decisão", "economia comportamental"],
  },
  {
    id: "bandura-1977-autoeficacia",
    title: "Self-efficacy: Toward a unifying theory of behavioral change",
    titlePt: "Autoeficácia: rumo a uma teoria unificadora da mudança comportamental",
    authors: "Bandura, Albert",
    year: 1977,
    venue: "Psychological Review",
    doi: "10.1037/0033-295X.84.2.191",
    wing: "mente",
    note: "Acreditar que se é capaz muda o resultado: a crença de eficácia move a ação.",
    tags: ["autoeficácia", "motivação", "aprendizagem"],
  },
  {
    id: "ross-1977-erro-fundamental",
    title:
      "The Intuitive Psychologist And His Shortcomings: Distortions in the Attribution Process",
    titlePt: "O psicólogo intuitivo e suas falhas: distorções no processo de atribuição",
    authors: "Ross, Lee",
    year: 1977,
    venue: "Advances in Experimental Social Psychology",
    doi: "10.1016/s0065-2601(08)60357-3",
    wing: "mente",
    note: "O erro fundamental de atribuição: culpamos a pessoa e ignoramos o sistema.",
    tags: ["atribuição", "viés", "psicologia social"],
  },
  {
    id: "steele-1988-afirmacao",
    title: "The Psychology of Self-Affirmation: Sustaining the Integrity of the Self",
    titlePt: "A psicologia da autoafirmação: sustentando a integridade do eu",
    authors: "Steele, Claude M.",
    year: 1988,
    venue: "Advances in Experimental Social Psychology",
    doi: "10.1016/s0065-2601(08)60229-4",
    wing: "mente",
    note: "Protegemos nossa autoimagem — mesmo à custa da verdade.",
    tags: ["autoafirmação", "identidade", "cognição"],
  },
  {
    id: "steele-aronson-1995-ameaca",
    title: "Stereotype threat and the intellectual test performance of African Americans",
    titlePt: "Ameaça do estereótipo e o desempenho intelectual de afro-americanos",
    authors: "Steele, Claude M.; Aronson, Joshua",
    year: 1995,
    venue: "Journal of Personality and Social Psychology",
    doi: "10.1037/0022-3514.69.5.797",
    wing: "mente",
    note: "O medo de confirmar um estereótipo sabota o próprio desempenho.",
    tags: ["estereótipo", "desempenho", "identidade"],
  },
  {
    id: "festinger-carlsmith-1959",
    title: "Cognitive consequences of forced compliance",
    titlePt: "Consequências cognitivas da conformidade forçada",
    authors: "Festinger, Leon; Carlsmith, James M.",
    year: 1959,
    venue: "The Journal of Abnormal and Social Psychology",
    doi: "10.1037/h0041593",
    wing: "mente",
    note: "A dissonância cognitiva: mudamos a crença para justificar o que fomos obrigados a fazer.",
    tags: ["dissonância", "cognição", "psicologia social"],
  },
  {
    id: "rosenthal-jacobson-1968",
    title: "Pygmalion in the classroom",
    titlePt: "Pigmalião na sala de aula",
    authors: "Rosenthal, Robert; Jacobson, Lenore",
    year: 1968,
    venue: "The Urban Review",
    doi: "10.1007/bf02322211",
    wing: "mente",
    note: "A expectativa do professor molda o desempenho do aluno: o efeito Pigmalião.",
    tags: ["expectativa", "educação", "profecia"],
  },
  {
    id: "tajfel-turner-1979",
    title: "An Integrative Theory of Intergroup Conflict",
    titlePt: "Uma teoria integradora do conflito entre grupos",
    authors: "Tajfel, Henri; Turner, John",
    year: 1979,
    venue: "The Social Psychology of Intergroup Relations",
    doi: "10.1093/oso/9780199269464.003.0005",
    wing: "mente",
    note: "Basta um 'nós' e um 'eles' para nascer a discriminação — a identidade social divide.",
    tags: ["identidade social", "conflito", "grupos"],
  },
];

export const MUSEUM_SIZE = MUSEUM_WORKS.length;

export function worksByWing(wing: MuseumWingId): MuseumWork[] {
  return MUSEUM_WORKS.filter((w) => w.wing === wing);
}

export function museumDoiUrl(doi: string): string {
  return `https://doi.org/${doi}`;
}
