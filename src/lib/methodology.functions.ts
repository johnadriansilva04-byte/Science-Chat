import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import * as repo from "@/lib/cf/repo.server";
import { legendToJson, parseLegend, type MethodologySymbol } from "@/lib/methodology";

/** Metodologia pronta para a UI e para o prompt. */
export type MethodologyView = {
  id: string;
  name: string;
  description: string | null;
  formula: string;
  legend: MethodologySymbol[];
  structureHint: string | null;
  updated_at: string;
};

export type MethodologyList = {
  methodologies: MethodologyView[];
  /** Metodologia ativa do artigo (null quando nenhuma foi aplicada). */
  activeId: string | null;
};

function toView(row: repo.MethodologyRow): MethodologyView {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    formula: row.formula,
    legend: parseLegend(row.legend),
    structureHint: row.structure_hint,
    updated_at: row.updated_at,
  };
}

function normalizeLegend(legend: MethodologySymbol[] | string | undefined): MethodologySymbol[] {
  if (!legend) return [];
  return typeof legend === "string" ? parseLegend(legend) : parseLegend(legendToJson(legend));
}

export const listMethodologies = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }): Promise<MethodologyList> => {
    const rows = await repo.listMethodologies(context.user.id);
    let activeId: string | null = null;
    if (data.articleId) {
      const article = await repo.getArticle(context.user.id, data.articleId);
      activeId = article?.methodology_id ?? null;
    }
    return { methodologies: rows.map(toView), activeId };
  });

export const saveMethodology = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    (d: {
      id?: string;
      articleId?: string;
      name: string;
      description?: string;
      formula: string;
      legend?: MethodologySymbol[] | string;
      structureHint?: string;
    }) => d,
  )
  .handler(async ({ data, context }): Promise<MethodologyView> => {
    const name = data.name?.trim().slice(0, 120);
    const formula = data.formula?.trim().slice(0, 200);
    if (!name) throw new Error("Dê um nome à metodologia");
    if (!formula) throw new Error("Informe a fórmula da metodologia");
    const legend = normalizeLegend(data.legend);
    const fields = {
      name,
      description: data.description?.trim().slice(0, 1000) || null,
      formula,
      legend: legendToJson(legend),
      structureHint: data.structureHint?.trim().slice(0, 4000) || null,
    };
    const row = data.id
      ? await repo.updateMethodology(context.user.id, data.id, fields)
      : await repo.createMethodology(context.user.id, {
          ...fields,
          articleId: data.articleId ?? null,
        });
    if (!row) throw new Error("Metodologia não encontrada");
    return toView(row);
  });

/** Aplica a metodologia ao artigo (ou limpa com `methodologyId: null`). */
export const applyMethodology = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; methodologyId: string | null }) => d)
  .handler(async ({ data, context }) => {
    const ok = await repo.setArticleMethodology(
      context.user.id,
      data.articleId,
      data.methodologyId,
    );
    if (!ok) throw new Error("Metodologia não encontrada");
    const row = data.methodologyId
      ? await repo.getMethodology(context.user.id, data.methodologyId)
      : null;
    return { ok: true, active: row ? toView(row) : null };
  });

export const deleteMethodology = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { methodologyId: string }) => d)
  .handler(async ({ data, context }) => {
    await repo.deleteMethodology(context.user.id, data.methodologyId);
    return { ok: true };
  });
