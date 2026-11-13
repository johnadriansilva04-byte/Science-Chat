import { useCallback, useEffect, useState } from "react";
import { Landmark, Loader2, Save, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEditorial, saveEditorial, type EditorialView } from "@/lib/editorial.functions";
import {
  DESTINATIONS,
  STANDARDS,
  UDELAR_UNITS,
  type CitationStandard,
  type EditorialDestination,
} from "@/lib/editorial";

const LEVEL_STYLE: Record<string, string> = {
  obrigatorio: "border-red-300 bg-red-50 text-red-800",
  recomendado: "border-emerald-300 bg-emerald-50 text-emerald-800",
  verificar: "border-amber-300 bg-amber-50 text-amber-800",
};

const LEVEL_LABEL: Record<string, string> = {
  obrigatorio: "Obrigatório",
  recomendado: "Recomendado",
  verificar: "A verificar",
};

/**
 * Configuração editorial. A Udelar é a referência inicial, mas o sistema não
 * inventa normas: as exigências específicas ficam marcadas como "a verificar"
 * até o pesquisador registrar as diretrizes oficiais consultadas.
 */
export function EditorialPanel({ articleId }: { articleId: string }) {
  const [config, setConfig] = useState<EditorialView | null>(null);
  const [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState<EditorialDestination>("independente");
  const [unit, setUnit] = useState("");
  const [standard, setStandard] = useState<CitationStandard>("abnt");
  const [guidelines, setGuidelines] = useState("");
  const [notes, setNotes] = useState("");

  const apply = useCallback((view: EditorialView) => {
    setConfig(view);
    setDestination(view.destination);
    setUnit(view.unit ?? "");
    setStandard(view.standard);
    setGuidelines(view.guidelines ?? "");
    setNotes(view.notes ?? "");
  }, []);

  useEffect(() => {
    getEditorial({ data: { articleId } })
      .then(apply)
      .catch(() => toast.error("Não foi possível carregar a configuração editorial"));
  }, [articleId, apply]);

  async function save() {
    setBusy(true);
    try {
      const view = await saveEditorial({
        data: { articleId, destination, unit, standard, language: "pt", guidelines, notes },
      });
      apply(view);
      toast.success("Configuração editorial salva");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar");
    } finally {
      setBusy(false);
    }
  }

  if (!config) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        Carregando configuração editorial…
      </p>
    );
  }

  const isUdelar = destination === "udelar";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-serif text-base">
            <Landmark className="size-4 text-primary" />
            Destino editorial
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            A Udelar é a referência inicial. O sistema nunca inventa normas: marque o destino e
            registre as diretrizes oficiais que você consultou.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Destino</Label>
            <Select
              value={destination}
              onValueChange={(v) => setDestination(v as EditorialDestination)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DESTINATIONS.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {DESTINATIONS.find((d) => d.id === destination)?.hint}
            </p>
          </div>

          {(isUdelar || destination === "outra") && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                {isUdelar ? "Unidade / publicação" : "Publicação / evento"}
              </Label>
              {isUdelar ? (
                <>
                  <Select
                    value={unit || "__none__"}
                    onValueChange={(v) => setUnit(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione a unidade…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Prefiro informar depois</SelectItem>
                      {UDELAR_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Ou escreva a unidade exata"
                    className="h-8 text-xs"
                  />
                </>
              ) : (
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Nome da revista, universidade ou evento"
                  className="h-9 text-sm"
                />
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Norma de citação</Label>
            <Select value={standard} onValueChange={(v) => setStandard(v as CitationStandard)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STANDARDS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {STANDARDS.find((s) => s.id === standard)?.hint}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Diretrizes / instruções aos autores (cole aqui)</Label>
            <Textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              rows={4}
              placeholder="Cole as exigências oficiais consultadas. Ao salvar, o sistema registra a data da conferência."
            />
            {config.verified_at && (
              <p className="flex items-center gap-1 text-[11px] text-emerald-700">
                <ShieldCheck className="size-3" />
                Diretrizes registradas — conferidas em{" "}
                {new Date(config.verified_at).toLocaleString("pt-BR")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: prazo de submissão, idioma exigido"
              className="h-8 text-xs"
            />
          </div>

          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar configuração
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-serif text-base">
            <ShieldAlert className="size-4 text-primary" />
            Requisitos identificados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {config.requirements.map((r) => (
            <div
              key={r.label}
              className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
            >
              <span>{r.label}</span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                  LEVEL_STYLE[r.level] ?? ""
                }`}
              >
                {LEVEL_LABEL[r.level] ?? r.level}
              </span>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-muted-foreground">
            Itens “a verificar” dependem dos documentos oficiais da unidade/revista e não são
            afirmados como obrigatórios sem confirmação.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-base">Estrutura proposta</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1 pl-5 text-xs">
            {config.structure.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="pt-2 text-[11px] text-muted-foreground">
            A ordem e as seções se ajustam à natureza da pesquisa e às exigências reais da
            publicação escolhida.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
