import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import * as repo from "@/lib/cf/repo.server";
import {
  DEFAULT_EDITORIAL,
  destinationLabel,
  editorialSummary,
  formatReference,
  proposedStructure,
  requirementsFor,
  standardLabel,
  type CitationStandard,
  type EditorialConfig,
  type EditorialDestination,
} from "@/lib/editorial";
import { resolveDocumentMeta, mergeDocumentMeta, type DocumentMeta } from "@/lib/front-matter";

export type EditorialView = EditorialConfig & {
  requirements: { label: string; level: "obrigatorio" | "recomendado" | "verificar" }[];
  structure: string[];
  summary: string;
};

/** Lê o JSON de identificação do trabalho, ignorando valores inválidos. */
function parseLayout(raw: string | null): Partial<DocumentMeta> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "document" in parsed) {
      return (parsed as { document: Partial<DocumentMeta> }).document;
    }
    return parsed as Partial<DocumentMeta>;
  } catch {
    return null;
  }
}

function toView(row: repo.EditorialRow | null, fallbackAuthor: string): EditorialView {
  const config: EditorialConfig = row
    ? {
        destination: row.destination as EditorialDestination,
        unit: row.unit,
        standard: row.standard as CitationStandard,
        language: row.language,
        guidelines: row.guidelines,
        notes: row.notes,
        verified_at: row.verified_at,
        document: resolveDocumentMeta(parseLayout(row.layout_json), fallbackAuthor),
      }
    : { ...DEFAULT_EDITORIAL, document: resolveDocumentMeta(null, fallbackAuthor) };
  // A estrutura depende da natureza da pesquisa; o pesquisador pode ter
  // informado "empírica" nas diretrizes — sinal simples e conservador.
  const empirical = /experiment|dados|amostra|quantitativ|qualitativ|emp[íi]ric/i.test(
    config.guidelines ?? "",
  );
  return {
    ...config,
    requirements: requirementsFor(config),
    structure: proposedStructure({ destination: config.destination, empirical }),
    summary: editorialSummary(config),
  };
}

export const getEditorial = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }): Promise<EditorialView> => {
    const row = await repo.getEditorialConfig(context.user.id, data.articleId);
    return toView(row, context.user.display_name ?? context.user.email);
  });

export const saveEditorial = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    (d: {
      articleId: string;
      destination: EditorialDestination;
      unit?: string;
      standard: CitationStandard;
      language: string;
      guidelines?: string;
      notes?: string;
      document?: Partial<DocumentMeta>;
    }) => d,
  )
  .handler(async ({ data, context }): Promise<EditorialView> => {
    const fallbackAuthor = context.user.display_name ?? context.user.email;
    // O painel editorial não edita o ORCID (ele é capturado no chat). Sem
    // preservar o valor já gravado, salvar as configurações o apagaria.
    const existing = await repo.getEditorialConfig(context.user.id, data.articleId);
    const existingDoc = parseLayout(existing?.layout_json ?? null);
    const document = resolveDocumentMeta(
      mergeDocumentMeta(data.document ?? null, existingDoc),
      fallbackAuthor,
    );
    const row = await repo.upsertEditorialConfig(context.user.id, data.articleId, {
      destination: data.destination,
      unit: data.unit?.trim() || null,
      standard: data.standard,
      language: data.language || "pt",
      guidelines: data.guidelines?.trim() || null,
      notes: data.notes?.trim() || null,
      layoutJson: JSON.stringify({ document }),
    });
    return toView(row, fallbackAuthor);
  });

/** Formata referências (das bases públicas ou informadas) conforme a norma. */
export const formatReferences = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    (d: {
      articleId: string;
      references: {
        authors: string;
        year: number | null;
        title: string;
        venue: string;
        doi: string | null;
        url: string | null;
      }[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const row = await repo.getEditorialConfig(context.user.id, data.articleId);
    const standard = (row?.standard ?? "abnt") as CitationStandard;
    const formatted = data.references.map((ref) => formatReference(ref, standard));
    return { standard, label: standardLabel(standard), formatted };
  });

export { destinationLabel };
