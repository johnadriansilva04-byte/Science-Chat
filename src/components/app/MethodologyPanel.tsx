import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, FlaskConical, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_FORMULA,
  DEFAULT_LEGEND,
  DEFAULT_STRUCTURE_HINT,
  formatLegend,
  missingLegendSymbols,
  type MethodologySymbol,
} from "@/lib/methodology";
import {
  applyMethodology,
  deleteMethodology,
  listMethodologies,
  saveMethodology,
  type MethodologyView,
} from "@/lib/methodology.functions";

type FormState = {
  id?: string;
  name: string;
  description: string;
  formula: string;
  legend: MethodologySymbol[];
  structureHint: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  formula: "",
  legend: [{ symbol: "", meaning: "" }],
  structureHint: "",
};

const REFERENCE_FORM: FormState = {
  name: "Confronto documental (referência)",
  description:
    "Cada confronto opõe a tese do pesquisador à resposta do Estado sobre a mesma realidade.",
  formula: DEFAULT_FORMULA,
  legend: DEFAULT_LEGEND.map((s) => ({ ...s })),
  structureHint: DEFAULT_STRUCTURE_HINT,
};

function fromView(view: MethodologyView): FormState {
  return {
    id: view.id,
    name: view.name,
    description: view.description ?? "",
    formula: view.formula,
    legend: view.legend.length ? view.legend.map((s) => ({ ...s })) : [{ symbol: "", meaning: "" }],
    structureHint: view.structureHint ?? "",
  };
}

/**
 * Painel de metodologias. A fórmula é DADO: o pesquisador escolhe uma metodologia
 * salva ou cria a própria (nome, fórmula, legenda dos símbolos e estrutura) e a
 * aplica ao artigo. A geração da próxima página passa a obedecer a fórmula.
 */
export function MethodologyPanel({
  articleId,
  onApplied,
  onOpenProduction,
}: {
  articleId: string;
  onApplied?: () => void;
  onOpenProduction?: () => void;
}) {
  const [items, setItems] = useState<MethodologyView[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await listMethodologies({ data: { articleId } });
      setItems(data.methodologies);
      setActiveId(data.activeId);
    } catch {
      toast.error("Não foi possível carregar as metodologias");
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const active = useMemo(() => items.find((m) => m.id === activeId) ?? null, [items, activeId]);

  const missing = useMemo(() => {
    if (!form) return [];
    return missingLegendSymbols(form.formula, form.legend);
  }, [form]);

  function patch(patchValue: Partial<FormState>) {
    setForm((current) => (current ? { ...current, ...patchValue } : current));
  }

  function patchSymbol(index: number, patchValue: Partial<MethodologySymbol>) {
    setForm((current) => {
      if (!current) return current;
      const legend = current.legend.map((item, i) =>
        i === index ? { ...item, ...patchValue } : item,
      );
      return { ...current, legend };
    });
  }

  function addSymbol() {
    setForm((current) =>
      current ? { ...current, legend: [...current.legend, { symbol: "", meaning: "" }] } : current,
    );
  }

  function removeSymbol(index: number) {
    setForm((current) => {
      if (!current) return current;
      const legend = current.legend.filter((_, i) => i !== index);
      return { ...current, legend: legend.length ? legend : [{ symbol: "", meaning: "" }] };
    });
  }

  async function save() {
    if (!form) return;
    const legend = form.legend.filter((s) => s.symbol.trim());
    if (!form.name.trim()) {
      toast.error("Dê um nome à metodologia");
      return;
    }
    if (!form.formula.trim()) {
      toast.error("Informe a fórmula da metodologia");
      return;
    }
    if (!legend.length) {
      toast.error("Defina ao menos um símbolo na legenda");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveMethodology({
        data: {
          ...(form.id ? { id: form.id } : {}),
          articleId,
          name: form.name,
          description: form.description,
          formula: form.formula,
          legend,
          structureHint: form.structureHint,
        },
      });
      setItems((current) => {
        const rest = current.filter((m) => m.id !== saved.id);
        return [saved, ...rest];
      });
      const isNew = !form.id;
      setForm(null);
      if (isNew) {
        // Criar já aplica: o pesquisador acabou de definir a fórmula para ESTE artigo.
        try {
          await applyMethodology({ data: { articleId, methodologyId: saved.id } });
          setActiveId(saved.id);
          onApplied?.();
          toast.success("Metodologia criada e aplicada ao artigo");
        } catch {
          toast.success("Metodologia criada");
          toast.error('Não foi possível aplicá-la agora — use "Aplicar" na lista.');
        }
      } else {
        toast.success("Metodologia atualizada");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a metodologia");
    } finally {
      setBusy(false);
    }
  }

  async function apply(methodologyId: string | null) {
    setBusy(true);
    try {
      await applyMethodology({ data: { articleId, methodologyId } });
      setActiveId(methodologyId);
      toast.success(
        methodologyId
          ? "Metodologia aplicada — a próxima página seguirá a fórmula"
          : "Metodologia removida do artigo",
      );
      onApplied?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível aplicar a metodologia");
    } finally {
      setBusy(false);
    }
  }

  async function remove(view: MethodologyView) {
    if (!confirm(`Excluir a metodologia "${view.name}"?`)) return;
    setBusy(true);
    try {
      await deleteMethodology({ data: { methodologyId: view.id } });
      setItems((current) => current.filter((m) => m.id !== view.id));
      if (activeId === view.id) setActiveId(null);
      toast.success("Metodologia excluída");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        Carregando metodologias…
      </p>
    );
  }

  if (form) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-serif text-base">
              <FlaskConical className="size-4 text-primary" />
              {form.id ? "Editar metodologia" : "Nova metodologia"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              A fórmula é sua: escreva os símbolos que quiser e defina o que cada um significa. A IA
              recebe fórmula, legenda e estrutura e obedece.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="methodology-name">
                Nome
              </Label>
              <Input
                id="methodology-name"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Ex.: Confronto documental"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="methodology-formula">
                Fórmula
              </Label>
              <Input
                id="methodology-formula"
                value={form.formula}
                onChange={(e) => patch({ formula: e.target.value })}
                placeholder="Ex.: A + B¹/B₂ = D"
                className="h-9 font-mono text-sm"
              />
              {missing.length > 0 && (
                <p className="text-[11px] text-amber-700">
                  Sem legenda para: {missing.join(", ")}. Defina o significado para a IA não
                  adivinhar.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Legenda dos símbolos</Label>
              <div className="space-y-2">
                {form.legend.map((item, index) => (
                  <div key={index} className="flex items-start gap-1.5">
                    <Input
                      value={item.symbol}
                      onChange={(e) => patchSymbol(index, { symbol: e.target.value })}
                      placeholder="Símbolo"
                      aria-label={`Símbolo ${index + 1}`}
                      className="h-8 w-20 font-mono text-sm"
                    />
                    <Input
                      value={item.meaning}
                      onChange={(e) => patchSymbol(index, { meaning: e.target.value })}
                      placeholder="O que significa"
                      aria-label={`Significado do símbolo ${index + 1}`}
                      className="h-8 flex-1 text-sm"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0"
                      onClick={() => removeSymbol(index)}
                      aria-label="Remover símbolo"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addSymbol}>
                <Plus className="size-3.5" />
                Adicionar símbolo
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="methodology-description">
                Descrição (opcional)
              </Label>
              <Textarea
                id="methodology-description"
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                rows={2}
                className="text-sm"
                placeholder="Em uma frase: o que a fórmula compara e conclui."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="methodology-structure">
                Instruções de estrutura
              </Label>
              <Textarea
                id="methodology-structure"
                value={form.structureHint}
                onChange={(e) => patch({ structureHint: e.target.value })}
                rows={4}
                className="text-sm"
                placeholder="Como as seções devem ser organizadas: bloco da fórmula, confrontos, replicação, fechamento."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            Salvar metodologia
          </Button>
          <Button variant="ghost" onClick={() => setForm(null)} disabled={busy}>
            <X />
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-serif text-base">
            <FlaskConical className="size-4 text-primary" />
            Metodologia do artigo
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Aplicada ao artigo, a metodologia entra no prompt de cada página: mesmos símbolos, mesma
            legenda e confrontos nomeados até o fechamento.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {active ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Check className="size-3.5" />
                Aplicada: {active.name}
              </p>
              <p className="mt-1 font-mono text-sm">{active.formula}</p>
              {active.legend.length > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatLegend(active.legend)}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {onOpenProduction && (
                  <Button size="sm" variant="secondary" onClick={onOpenProduction}>
                    Ir para a produção
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => void apply(null)} disabled={busy}>
                  Remover aplicação
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Nenhuma metodologia aplicada. Escolha uma abaixo ou crie a sua — a próxima página
              gerada passará a seguir a fórmula.
            </p>
          )}

          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Você ainda não salvou metodologias.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const isActive = item.id === activeId;
                return (
                  <li
                    key={item.id}
                    className={`rounded-lg border p-3 ${isActive ? "border-primary/40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {item.formula}
                        </p>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {isActive && (
                        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          ativa
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant={isActive ? "ghost" : "secondary"}
                        onClick={() => void apply(item.id)}
                        disabled={busy || isActive}
                      >
                        {isActive ? "Aplicada" : "Aplicar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setForm(fromView(item))}
                        disabled={busy}
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void remove(item)}
                        disabled={busy}
                        aria-label={`Excluir ${item.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setForm({ ...EMPTY_FORM, legend: [{ symbol: "", meaning: "" }] })}>
          <Plus />
          Nova metodologia
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setForm({ ...REFERENCE_FORM, legend: DEFAULT_LEGEND.map((s) => ({ ...s })) })
          }
        >
          Usar o modelo de referência
        </Button>
      </div>
    </div>
  );
}
