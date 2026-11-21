/**
 * Perguntas pré-estabelecidas do onboarding: a dúvida principal (o que é o
 * ORCID) fica em destaque e as demais ficam ocultas, expandíveis, dentro do
 * cartão do Pracinha. Texto em pt-BR, com fundamento real e tom de mentoria.
 */
export type OnboardingFaq = {
  id: string;
  question: string;
  answer: string;
};

/** A dúvida principal — aparece sempre, sem clique. */
export const ONBOARDING_MAIN: OnboardingFaq = {
  id: "orcid",
  question: "O que é o ORCID e por que ele importa?",
  answer:
    "O ORCID é um identificador único, permanente e gratuito (formato 0000-0000-0000-0000) que assina a sua autoria. Ele é pessoal — não pertence a universidade nenhuma — e serve para você não se confundir com homônimos e para as revistas saberem exatamente quem escreveu. É recomendado, não obrigatório: dá para publicar sem ele, mas ele facilita muito.",
};

/** Demais dúvidas: ocultas até o pesquisador querer ver. */
export const ONBOARDING_FAQS: OnboardingFaq[] = [
  {
    id: "vinculo",
    question: "Preciso de faculdade ou vínculo institucional para publicar?",
    answer:
      "Não. O que qualifica um artigo é o método e a responsabilidade do autor, não o crachá. Você pode se identificar como “Pesquisador(a) independente” e informar só o seu e-mail de contato. Muitas revistas de acesso aberto aceitam submissões sem vínculo.",
  },
  {
    id: "diploma",
    question: "Preciso de diploma, mestrado ou orientador?",
    answer:
      "Não para submeter. As revistas avaliam o trabalho (revisão por pares), não o seu título. Um orientador ajuda, mas não é pré-requisito — e você pode citar colegas e especialistas como leitores críticos antes de enviar.",
  },
  {
    id: "o-que-conta",
    question: "O que realmente conta como ciência?",
    answer:
      "Uma pergunta clara, um método que outros possam repetir, dados ou fontes que sustentem a conclusão e honestidade sobre os limites do estudo. Isso é ciência — e independe de onde você está.",
  },
  {
    id: "onde-publicar",
    question: "Como escolho a revista certa?",
    answer:
      "Pelo escopo (a revista tem que ser sobre o seu tema), pela política de acesso e pelas normas de formatação. Confira sempre o site oficial e o guia de autores. Revistas de acesso aberto e de sociedade científica costumam ser boas portas de entrada.",
  },
  {
    id: "custo",
    question: "Publicar custa dinheiro?",
    answer:
      "Depende da revista. Muitas são gratuitas para autores e leitores (acesso aberto diamante) e outras cobram taxa de publicação (APC). O ORCID é sempre gratuito. Leia a política de taxas antes de submeter.",
  },
  {
    id: "revisao",
    question: "O que acontece depois que eu envio?",
    answer:
      "A revista faz uma checagem inicial e, se passar, envia para revisão por pares: especialistas leem o trabalho e pedem ajustes. Você responde aos comentários e, aprovado, o artigo é publicado com DOI — o registro permanente dele.",
  },
];

export const ONBOARDING_FAQS_ALL: OnboardingFaq[] = [ONBOARDING_MAIN, ...ONBOARDING_FAQS];

/** Mensagem pré-escrita que o clique numa pergunta injeta no chat. */
export function faqSeed(question: string): string {
  return `${question} Me explique de forma clara e prática, com uma fonte oficial quando fizer sentido.`;
}

const PENDING_KEY = "sc:onboarding-question";

/** O que ficou guardado: o texto e se ele veio do FAQ (resposta pronta). */
export type PendingQuestion = { text: string; fromFaq: boolean };

/**
 * Guarda a pergunta escolhida no cadastro para o chat respondê-la ao entrar.
 *
 * `fromFaq` separa as duas origens que caem no mesmo slot: a pergunta pronta do
 * Pracinha (que pede uma explicação didática) e a inquietação que a pessoa
 * digitou na home (que já é o problema da pesquisa e não deve ganhar instrução
 * colada — era isso que virava título e semente com um texto a mais).
 */
export function setPendingQuestion(question: string, fromFaq = false): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ text: question, fromFaq }));
  } catch {
    /* armazenamento indisponível — segue sem a pergunta pendente */
  }
}

/** Recupera (e limpa) a pergunta pendente, uma única vez. */
export function takePendingQuestion(): PendingQuestion | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const value = sessionStorage.getItem(PENDING_KEY);
    if (!value) return null;
    sessionStorage.removeItem(PENDING_KEY);
    // Compatibilidade com o formato antigo (só a string).
    if (!value.startsWith("{")) return { text: value, fromFaq: false };
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { text, fromFaq } = parsed as Partial<PendingQuestion>;
    if (typeof text !== "string" || !text.trim()) return null;
    return { text, fromFaq: fromFaq === true };
  } catch {
    return null;
  }
}
