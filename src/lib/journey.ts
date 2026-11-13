import type { LucideIcon } from "lucide-react";
import { Flame, Search, LayoutList, PenLine, Award } from "lucide-react";

/**
 * A jornada científica do ScienceChat em cinco atos, cada um com uma emoção.
 * É a espinha dorsal da UX: o trilho vivo, a cortina de transição e as dinâmicas
 * de resultado derivam daqui, para a experiência contar uma história coerente —
 * da inquietação à obra — em vez de mostrar telas soltas.
 */
export type JourneyActId = "ignite" | "interrogate" | "structure" | "produce" | "work";

export type JourneyAct = {
  id: JourneyActId;
  /** Nome curto exibido no trilho. */
  label: string;
  /** Verbo no infinitivo, para a mensagem de transição. */
  verb: string;
  /** A emoção daquele momento, em uma frase. */
  tagline: string;
  /** Frase longa de boas-vindas ao entrar no ato (cortina de transição). */
  welcome: string;
  /** Cor de acento (oklch) que tinge trilho, cortina e destaques do ato. */
  color: string;
  icon: LucideIcon;
};

export const JOURNEY_ACTS: JourneyAct[] = [
  {
    id: "ignite",
    label: "Ignição",
    verb: "acender a ideia",
    tagline: "Toda ciência começa com uma inquietação.",
    welcome: "Vamos transformar a sua inquietação em um problema de pesquisa.",
    color: "oklch(0.62 0.19 45)",
    icon: Flame,
  },
  {
    id: "interrogate",
    label: "Interrogatório",
    verb: "interrogar a tese",
    tagline: "Vou apertar cada lacuna até o argumento ficar sólido.",
    welcome: "Agora vou testar a sua tese — com evidência real na mão.",
    color: "oklch(0.5 0.14 275)",
    icon: Search,
  },
  {
    id: "structure",
    label: "Estrutura",
    verb: "desenhar a estrutura",
    tagline: "Antes de escrever, combinamos o esqueleto do artigo.",
    welcome: "Organizei o seu material. Veja como o artigo vai ficar — e aprove.",
    color: "oklch(0.55 0.11 200)",
    icon: LayoutList,
  },
  {
    id: "produce",
    label: "Produção",
    verb: "escrever página por página",
    tagline: "Uma página por vez. Você aprova cada uma antes de seguir.",
    welcome: "Agora construímos o documento página por página, com a sua aprovação.",
    color: "oklch(0.55 0.13 25)",
    icon: PenLine,
  },
  {
    id: "work",
    label: "Obra",
    verb: "selar a obra",
    tagline: "Páginas aprovadas viram um artigo científico completo.",
    welcome: "Sua obra está de pé. Revise o conjunto e prepare a exportação.",
    color: "oklch(0.5 0.11 155)",
    icon: Award,
  },
];

const ACT_INDEX: Record<JourneyActId, number> = JOURNEY_ACTS.reduce(
  (acc, act, i) => ({ ...acc, [act.id]: i }),
  {} as Record<JourneyActId, number>,
);

export function actAt(index: number): JourneyAct {
  const clamped = Math.min(Math.max(index, 0), JOURNEY_ACTS.length - 1);
  return JOURNEY_ACTS[clamped] ?? JOURNEY_ACTS[0]!;
}

/**
 * Em que ato o projeto está, a partir da fase persistida e do progresso real da
 * entrevista/produção. Fase "done" só vira "Obra" quando há páginas aprovadas;
 * caso contrário fica em "Produção".
 */
export function journeyIndex(input: {
  phase: string;
  approvedPages?: number;
  hasDraft?: boolean;
  interviewRatio?: number;
}): number {
  const { phase, approvedPages = 0, hasDraft = false, interviewRatio = 0 } = input;
  if (phase === "done") return ACT_INDEX.work;
  if (phase === "writing") return approvedPages > 0 ? ACT_INDEX.produce : ACT_INDEX.structure;
  if (phase === "plan") return ACT_INDEX.structure;
  // Entrevista: "Ignição" enquanto a conversa é curta; depois "Interrogatório".
  return interviewRatio >= 0.25 || hasDraft ? ACT_INDEX.interrogate : ACT_INDEX.ignite;
}

/** Percentual dentro do ato atual, para a barra de progresso do trilho. */
export function journeyPercent(input: {
  phase: string;
  approvedPages?: number;
  totalPages?: number;
  hasDraft?: boolean;
  interviewRatio?: number;
}): number {
  const index = journeyIndex(input);
  if (index === ACT_INDEX.ignite) return Math.round((input.interviewRatio ?? 0) * 100);
  if (index === ACT_INDEX.interrogate) {
    const r = input.interviewRatio ?? 0;
    return Math.round(Math.max(0, (r - 0.25) / 0.75) * 100);
  }
  if (index === ACT_INDEX.produce) {
    const total = input.totalPages ?? 0;
    if (total <= 0) return 0;
    return Math.round(((input.approvedPages ?? 0) / total) * 100);
  }
  return index === ACT_INDEX.work ? 100 : 0;
}
