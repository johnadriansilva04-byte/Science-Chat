/**
 * Configuração editorial. A Udelar é a referência INICIAL do ScienceChat, mas o
 * sistema nunca inventa normas: aqui ficam apenas as opções de destino, as
 * normas de citação conhecidas e a ESTRUTURA científica proposta. As exigências
 * específicas de cada unidade/revista são registradas pelo pesquisador (ou
 * verificadas por ele) em `guidelines`, com a data da verificação.
 */
export type EditorialDestination = "udelar" | "outra" | "independente";
export type CitationStandard =
  "abnt" | "apa" | "ieee" | "vancouver" | "chicago" | "udelar" | "propria";

export type EditorialConfig = {
  destination: EditorialDestination;
  unit: string | null;
  standard: CitationStandard;
  language: string;
  guidelines: string | null;
  notes: string | null;
  verified_at: string | null;
};

export const DEFAULT_EDITORIAL: EditorialConfig = {
  destination: "independente",
  unit: null,
  standard: "abnt",
  language: "pt",
  guidelines: null,
  notes: null,
  verified_at: null,
};

export const DESTINATIONS: { id: EditorialDestination; label: string; hint: string }[] = [
  {
    id: "udelar",
    label: "Universidad de la República (Udelar)",
    hint: "Referência inicial. A estrutura é ajustada à unidade/revista escolhida; as exigências devem ser conferidas nos documentos oficiais.",
  },
  {
    id: "outra",
    label: "Outra publicação",
    hint: "Outra universidade, revista ou evento científico. Informe as instruções aos autores.",
  },
  {
    id: "independente",
    label: "Pesquisa independente",
    hint: "Sem vínculo institucional ou destino definido. Estrutura científica adequada à natureza do trabalho, sem exigências institucionais inexistentes.",
  },
];

export const STANDARDS: { id: CitationStandard; label: string; hint: string }[] = [
  { id: "abnt", label: "ABNT", hint: "Norma brasileira; autores em caixa alta, ano ao final." },
  { id: "apa", label: "APA", hint: "Autor–data; referência com ano entre parênteses." },
  { id: "ieee", label: "IEEE", hint: "Numérica [1]; referências por ordem de citação." },
  { id: "vancouver", label: "Vancouver", hint: "Numérica; usada em ciências da saúde." },
  { id: "chicago", label: "Chicago", hint: "Autor–data ou notas." },
  {
    id: "udelar",
    label: "Normas da Udelar",
    hint: "Depende da unidade/revista — verificar nos documentos oficiais e registrar a versão consultada.",
  },
  {
    id: "propria",
    label: "Estrutura própria",
    hint: "O pesquisador define o formato; o sistema apenas organiza o que for informado.",
  },
];

/**
 * Unidades da Udelar oferecidas como SUGESTÃO para identificar o destino. A
 * lista é uma referência e NÃO substitui a consulta às diretrizes oficiais de
 * cada unidade (que mudam com o tempo e variam por publicação).
 */
export const UDELAR_UNITS: string[] = [
  "Facultad de Arquitectura, Diseño y Urbanismo",
  "Facultad de Artes",
  "Facultad de Ciencias",
  "Facultad de Ciencias Económicas y de Administración",
  "Facultad de Ciencias Sociales",
  "Facultad de Derecho",
  "Facultad de Enfermería",
  "Facultad de Humanidades y Ciencias de la Educación",
  "Facultad de Información y Comunicación",
  "Facultad de Ingeniería",
  "Facultad de Medicina",
  "Facultad de Odontología",
  "Facultad de Psicología",
  "Facultad de Química",
  "Facultad de Veterinaria",
  "Centros Universitarios Regionales (CENUR)",
  "Servicio / Instituto / Departamento (informar o nome)",
];

/** Seções canônicas, na ordem científica usual. */
export const CANONICAL_SECTIONS = [
  "Elementos iniciais",
  "Resumo e palavras-chave",
  "Introdução",
  "Fundamentação teórica",
  "Metodologia",
  "Resultados",
  "Discussão",
  "Conclusão",
  "Referências",
];

/**
 * Estrutura proposta conforme o destino e a natureza da pesquisa. Pesquisas
 * teóricas dispensam metodologia/resultados; pesquisas independentes não
 * carregam exigências institucionais. As exigências reais da unidade/revista
 * devem ser aplicadas por cima desta base.
 */
export function proposedStructure(input: {
  destination: EditorialDestination;
  empirical?: boolean;
}): string[] {
  const { empirical = false } = input;
  const sections = CANONICAL_SECTIONS.filter((s) => {
    if (empirical) return true;
    return s !== "Metodologia" && s !== "Resultados";
  });
  return [...sections];
}

export type Requirement = {
  label: string;
  level: "obrigatorio" | "recomendado" | "verificar";
};

/**
 * Requisitos que o sistema pode afirmar com honestidade. Nada aqui é uma norma
 * inventada: os itens marcados "verificar" dependem dos documentos oficiais da
 * unidade/revista e devem ser conferidos pelo pesquisador.
 */
export function requirementsFor(config: EditorialConfig): Requirement[] {
  const reqs: Requirement[] = [
    { label: "Identificação do autor (nome como deseja publicar)", level: "obrigatorio" },
    { label: "Título do artigo", level: "obrigatorio" },
    { label: "Resumo e palavras-chave", level: "obrigatorio" },
    { label: "Referências das obras citadas", level: "obrigatorio" },
  ];
  if (config.destination === "udelar") {
    reqs.push(
      { label: "Unidade/revista de destino identificada", level: "recomendado" },
      {
        label: "Diretrizes oficiais da unidade conferidas (versão registrada)",
        level: "verificar",
      },
      { label: "Formatação específica exigida pela unidade/revista", level: "verificar" },
      { label: "Vínculo institucional, se houver", level: "recomendado" },
    );
  } else if (config.destination === "outra") {
    reqs.push(
      { label: "Instruções aos autores da publicação", level: "verificar" },
      { label: "Formato de submissão (modelo/template)", level: "verificar" },
    );
  } else {
    reqs.push({
      label: "Estrutura científica adequada à natureza da pesquisa",
      level: "obrigatorio",
    });
  }
  reqs.push({ label: `Norma de citação: ${standardLabel(config.standard)}`, level: "recomendado" });
  return reqs;
}

export function standardLabel(id: CitationStandard): string {
  return STANDARDS.find((s) => s.id === id)?.label ?? id;
}

export function destinationLabel(id: EditorialDestination): string {
  return DESTINATIONS.find((d) => d.id === id)?.label ?? id;
}

/** Referência estruturada, como devolvida pelas bases públicas. */
export type ReferenceFields = {
  authors: string;
  year: number | null;
  title: string;
  venue: string;
  doi: string | null;
  url: string | null;
};

/**
 * Formata uma referência conforme a norma escolhida. Não inventa dados: campos
 * ausentes simplesmente não aparecem. Serve de base para a seção de referências.
 */
export function formatReference(ref: ReferenceFields, standard: CitationStandard): string {
  const authors = ref.authors.trim();
  const year = ref.year ? String(ref.year) : "s.d.";
  const title = ref.title.trim();
  const venue = ref.venue.trim();
  const link = ref.doi ? `https://doi.org/${ref.doi}` : (ref.url ?? "");

  switch (standard) {
    case "apa":
      return `${authors} (${year}). ${title}. ${venue}.${link ? ` ${link}` : ""}`.trim();
    case "ieee":
    case "vancouver": {
      const tail = link ? ` Disponível em: ${link}` : "";
      return `${authors}. ${title}. ${venue}; ${year}.${tail}`.trim();
    }
    case "chicago":
      return `${authors}. "${title}." ${venue} (${year}).${link ? ` ${link}` : ""}`.trim();
    case "udelar":
    case "abnt":
    case "propria":
    default:
      return `${authors}. ${title}. ${venue}, ${year}.${link ? ` Disponível em: ${link}.` : ""}`.trim();
  }
}

/** Recapitulação editorial para a etapa de plano (requisito 14 do produto). */
export function editorialSummary(config: EditorialConfig): string {
  const lines = [`**Destino editorial:** ${destinationLabel(config.destination)}`];
  if (config.unit) lines.push(`**Unidade/publicação:** ${config.unit}`);
  lines.push(`**Norma de citação:** ${standardLabel(config.standard)}`);
  if (config.guidelines) {
    lines.push(
      `**Diretrizes registradas:** ${config.verified_at ? `conferidas em ${config.verified_at}` : "registradas (sem data de conferência)"}`,
    );
  } else {
    lines.push(
      "**Diretrizes registradas:** nenhuma — as exigências específicas precisam ser verificadas.",
    );
  }
  return lines.join("\n");
}
