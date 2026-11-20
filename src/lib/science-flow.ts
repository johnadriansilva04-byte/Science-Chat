/**
 * Fluxo "Ciência sem crachá" dentro do chat: o caminho de quem publica sem
 * vínculo institucional, servido em BOCADOS.
 *
 * Por que um fluxo separado: o card da home ensina tudo de uma vez, o que é
 * certo para quem só quer a resposta. No chat, despejar dez passos numa
 * mensagem é o oposto de ensinar — ninguém lê. Aqui cada bocado traz UMA ideia,
 * o porquê (importância) e o para-que-serve (uso prático), e o pesquisador
 * decide quando avançar. No fim, e só no fim, aparece o card para criar.
 *
 * Nada aqui consome cota de IA: os bocados são texto determinístico, então o
 * fluxo funciona mesmo com a Workers AI esgotada. O conteúdo normativo mora em
 * `science-access.ts` (fonte única das fontes oficiais).
 */

export type ScienceBite = {
  /** Número mostrado ao pesquisador (1-based). */
  n: number;
  title: string;
  /** O que fazer, em uma frase direta. */
  what: string;
  /** Por que importa — o fundamento. */
  why: string;
  /** Para que serve na prática. */
  whatFor: string;
};

/**
 * Os bocados. A ordem é deliberada: primeiro a PERMISSÃO (o medo), depois o
 * MÉTODO (o que reprova de verdade), depois a IDENTIDADE (ORCID), a ESCOLHA da
 * revista, a AFILIAÇÃO e, por fim, o que vem depois do aceite.
 */
export const SCIENCE_BITES: ScienceBite[] = [
  {
    n: 1,
    title: "Ciência não pede crachá",
    what: "Assine o artigo como você é — pesquisador(a) independente — sem inventar vínculo.",
    why: "O ICMJE — referência internacional para autoria — lista quatro critérios: contribuir de forma substancial, escrever ou revisar, aprovar a versão final e responder pelo trabalho. Nenhum deles é ter instituição.",
    whatFor:
      "Serve para você parar de esperar uma permissão que ninguém vai assinar. A revista avalia o trabalho, não o crachá de quem escreveu.",
  },
  {
    n: 2,
    title: "O que te qualifica é o método",
    what: "Tenha uma pergunta clara, evidência de verdade e diga também o que o seu estudo NÃO prova.",
    why: "O parecer avalia o manuscrito: se a conclusão se sustenta nos dados que você mostrou. É nisso que a decisão se apoia.",
    whatFor:
      "Serve para o seu artigo passar no que reprova de verdade — argumento sem prova — em vez de travar por um diploma que ninguém vai conferir.",
  },
  {
    n: 3,
    title: "ORCID: sua assinatura sem crachá",
    what: "Crie um ORCID gratuito (nome e e-mail, uns três minutos) e use na submissão e no rodapé do artigo.",
    why: "É um número único e SEU: separa você de homônimos e fixa a autoria mesmo sem instituição — por isso é aceito por revistas e universidades.",
    whatFor:
      "Serve para o seu nome ficar preso ao artigo para sempre. Sem ele, dois 'Silva' viram a mesma pessoa e o seu trabalho se perde.",
  },
  {
    n: 4,
    title: "Escolha a revista pelo escopo, não pela grife",
    what: "Leia as “instruções aos autores” e confira se o tema do seu artigo cabe naquela revista.",
    why: "Uma das causas mais comuns de recusa rápida (sem revisão) é desalinhamento de escopo: o editor não manda o texto adiante.",
    whatFor:
      "Serve para você não perder meses no lugar errado. E o DOAJ mostra o que uma revista séria é obrigada a publicar — bom teste antes de submeter.",
  },
  {
    n: 5,
    title: "Afiliação: escreva a verdade",
    what: "No campo de afiliação, escreva “Pesquisador(a) independente”.",
    why: "O campo é descritivo, não é prova de elegibilidade — é o que a sua situação é, dito com clareza.",
    whatFor:
      "Serve para você preencher o formulário com honestidade, sem inventar vínculo e sem deixar o campo em branco.",
  },
  {
    n: 6,
    title: "Depois do aceite: preprint e DOI",
    what: "Se quiser, publique um preprint (ex.: SciELO Preprints) antes; depois do aceite, divulgue o DOI.",
    why: "Preprint é público, gratuito e não pede vínculo; o DOI é a identidade permanente do artigo.",
    whatFor:
      "Serve para o trabalho existir e ser citado desde já — em vez de ficar invisível esperando a revista.",
  },
];

export type ScienceFlowStage = "idle" | "offered" | "running" | "finished";

export type ScienceFlowState = {
  stage: ScienceFlowStage;
  /** Índice (0-based) do bocado atual, quando `stage === "running"`. */
  index: number;
};

export const SCIENCE_FLOW_IDLE: ScienceFlowState = { stage: "idle", index: 0 };

/** Total de bocados — usado para o contador "2 de 6". */
export const SCIENCE_BITES_TOTAL = SCIENCE_BITES.length;

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * O pesquisador sinalizou a dúvida que este fluxo resolve?
 *
 * Exige sinal de FALTA (não tenho, sem, não sou) junto de algo acadêmico, ou uma
 * pergunta explícita sobre ser possível publicar assim. Evita disparar em quem
 * só menciona a instituição de passagem ("meu orientador da Udelar disse…").
 */
const LACK = /\b(nao tenho|nao possuo|nao sou|sem|nao fiz|nao terminei|nao me formei|nao estou)\b/;

/**
 * O que se pode "não ter" para o fluxo fazer sentido: vínculo acadêmico em si.
 * "Título" fica de fora de propósito — "não tenho certeza do título" é dúvida
 * autoral, não falta de credencial, e não deve abrir este caminho.
 */
const CREDENTIAL =
  /\b(instituicao|universidade|faculdade|vinculo|diploma|graduacao|mestrado|doutorado|orientador|laboratorio|lattes|curriculo|academi\w*|formacao|formei|formad\w*|bolsa|pesquisador independente|independente)\b/;
const ASKS_PERMISSION =
  /(posso|consigo|da para|da pra|e possivel|tem como|preciso|exige|obrigatorio|necessario)/;

/**
 * Dúvida é uma pergunta curta. Um parágrafo corrido é conteúdo: o pesquisador
 * colando a introdução, a missão de pesquisa ou um trecho do artigo. O texto do
 * próprio trabalho fala em "ausência de credencial" e "sem credencial" o tempo
 * todo, e abria o card no meio da escrita.
 */
const DOUBT_SHORT = 200;
const DOUBT_ABSOLUTE_MAX = 600;

/**
 * Verbo de pesquisa: "quero PESQUISAR como…", "vou ESTUDAR…", "minha pesquisa
 * é sobre…". É TEMA, não dúvida. Sem esta guarda, "quero pesquisar como o
 * autodidata sem vínculo institucional valida o método" abria o card, porque
 * casa "sem" + "vínculo" — o assunto do artigo era lido como insegurança do
 * autor.
 */
const RESEARCH_TOPIC =
  /\b(quero|pretendo|vou|gostaria de|busco|minha pesquisa|meu estudo|meu artigo|meu tema|a pesquisa|o estudo|pesquisar|investigar|estudar|analisar|compreender|entender como|comparar|mapear)\b[^.?]{0,80}\b(pesquisar|investigar|estudar|analisar|compreender|comparar|mapear|como|sobre|a respeito)\b/;

/**
 * "Pesquisador independente" só abre o card quando é AUTODECLARAÇÃO — o autor
 * falando de si ("sou…", "quero publicar como…"). Como assunto ("como um
 * pesquisador independente valida o método") é tema de pesquisa, e abrir o card
 * ali interrompe justamente quem está trabalhando.
 */
const SELF_PERSONA =
  /\b(sou|seria|quero (?:publicar|submeter|assinar)|publico|assino|me considero|trabalho como)\b[^?]{0,40}\bpesquisador(?:a)? independente\b/;

export function detectScienceDoubt(text: string): boolean {
  const q = normalize(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!q) return false;
  if (q.length > DOUBT_ABSOLUTE_MAX) return false;
  // Acima do tamanho de uma pergunta, só passa se for de fato uma pergunta.
  if (q.length > DOUBT_SHORT && !q.includes("?")) return false;
  // Autodeclaração de persona ("sou pesquisador independente", "quero publicar
  // como pesquisador independente") já é a dúvida que o fluxo resolve. Vem ANTES
  // da guarda de tema porque "quero publicar como…" casa RESEARCH_TOPIC.
  if (SELF_PERSONA.test(q)) return true;
  // Tema de pesquisa não é insegurança sobre credencial.
  if (RESEARCH_TOPIC.test(q) && !q.includes("?")) return false;
  // A falta precisa recair sobre a CREDENCIAL (vínculo, diploma, orientador),
  // não sobre qualquer palavra acadêmica.
  if (CREDENTIAL.test(q) && LACK.test(q)) return true;
  // Sem credencial no texto, ainda vale a pergunta explícita de permissão.
  if (!CREDENTIAL.test(q) && !/\b(publicar|submeter|artigo|revista)\b/.test(q)) return false;
  // Pergunta de permissão: "preciso de instituição?", "dá para publicar sem vínculo?"
  return ASKS_PERMISSION.test(q) && /(publicar|submeter|artigo|revista|ciencia)/.test(q);
}

/** Convite curto: UMA linha, sem lista e sem despejo de conteúdo. */
export const SCIENCE_FLOW_OFFER =
  "Essa dúvida tem resposta curta: não precisa. Quer que eu abra o caminho em partes — uma de cada vez, com o porquê de cada uma?";

const ACCEPT =
  /\b(sim|quero|pode|claro|bora|vamos|manda|mostra|conta|ensina|aceito|por favor|ok|beleza|vai)\b/;
const DECLINE = /\b(nao|depois|agora nao|dispenso|deixa|para|chega|outra hora|nao quero)\b/;

/** Aceitou ver o caminho? */
export function acceptsScienceFlow(text: string): boolean {
  const q = normalize(text ?? "");
  if (DECLINE.test(q)) return false;
  return ACCEPT.test(q);
}

/** Pediu para parar? */
export function declinesScienceFlow(text: string): boolean {
  const q = normalize(text ?? "");
  return DECLINE.test(q) && !/\bsim\b/.test(q);
}

/** Pediu o próximo bocado? */
export function advancesScienceFlow(text: string): boolean {
  const q = normalize(text ?? "");
  return /(continu|proxim|seguir|segue|avanc|vamos|mais|quero ver|pode|sim|ok|bora)/.test(q);
}

/** Estado inicial do fluxo já aceito (primeiro bocado à vista). */
export function startScienceFlow(): ScienceFlowState {
  return { stage: "running", index: 0 };
}

/** Bocado atual, ou `null` fora do estágio "running". */
export function currentScienceBite(state: ScienceFlowState): ScienceBite | null {
  if (state.stage !== "running") return null;
  return SCIENCE_BITES[state.index] ?? null;
}

/** Avança um bocado. No último, o fluxo termina e libera o card de criação. */
export function advanceScienceFlow(state: ScienceFlowState): ScienceFlowState {
  if (state.stage !== "running") return state;
  const next = state.index + 1;
  if (next >= SCIENCE_BITES.length) return { stage: "finished", index: SCIENCE_BITES.length - 1 };
  return { stage: "running", index: next };
}

/** Está no último bocado? Serve para trocar "Continuar" por "Concluir". */
export function isLastScienceBite(state: ScienceFlowState): boolean {
  return state.stage === "running" && state.index === SCIENCE_BITES.length - 1;
}

/** Rótulo do botão de avanço, para não repetir a mesma fórmula sempre. */
export function scienceFlowNextLabel(state: ScienceFlowState): string {
  if (isLastScienceBite(state)) return "Concluir";
  return state.index === 0 ? "Continuar" : "Próximo";
}

/** Contador humano ("2 de 6"), usado no cabeçalho do card. */
export function scienceFlowCounter(state: ScienceFlowState): string {
  const n = Math.min(state.index + 1, SCIENCE_BITES.length);
  return `${n} de ${SCIENCE_BITES.length}`;
}

/**
 * Fecho do fluxo: agora sim o card para criar. Uma frase, sem sermão — o
 * pesquisador já leu o caminho inteiro.
 */
export const SCIENCE_FLOW_DONE =
  "Isso é o essencial. O resto é escrever — e eu escrevo com você, página por página.";

/**
 * Semente injetada no artigo quando o pesquisador conclui o caminho e decide
 * criar. Fica aqui (e não no componente) para o chat não precisar importar a UI
 * do card da home só para pegar uma string.
 */
export const SCIENCE_FLOW_SEED =
  "Quero publicar como pesquisador(a) independente, sem vínculo institucional. Me ajude a escolher a revista pelo escopo, preencher a afiliação como “Pesquisador(a) independente”, criar meu ORCID e seguir as diretrizes oficiais.";

const DISMISS_KEY = "sciencechat.ciencia-sem-cracha.dismissed";

/**
 * O pesquisador já recusou o caminho neste artigo? Guardado no localStorage
 * porque o "não" precisa sobreviver à recarga: reaparecer a cada visita é a
 * forma mais rápida de transformar um convite útil em propaganda.
 */
export function wasScienceFlowDismissed(
  articleId: string,
  storage?: Pick<Storage, "getItem">,
): boolean {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (!store || !articleId) return false;
  try {
    const raw = store.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as unknown;
    return Array.isArray(ids) && ids.includes(articleId);
  } catch {
    return false;
  }
}

/** Registra a recusa. Mantém só os últimos 20 artigos para não crescer sem fim. */
export function dismissScienceFlow(
  articleId: string,
  storage?: Pick<Storage, "getItem" | "setItem">,
): void {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (!store || !articleId) return;
  try {
    const raw = store.getItem(DISMISS_KEY);
    const ids = Array.isArray(JSON.parse(raw ?? "[]")) ? (JSON.parse(raw ?? "[]") as string[]) : [];
    if (ids.includes(articleId)) return;
    store.setItem(DISMISS_KEY, JSON.stringify([...ids, articleId].slice(-20)));
  } catch {
    /* localStorage cheio ou bloqueado: o card só reaparece, nada quebra. */
  }
}
