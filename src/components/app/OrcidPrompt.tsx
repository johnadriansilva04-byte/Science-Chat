import { useMemo, useState } from "react";
import { Check, ExternalLink, IdCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidOrcid, normalizeOrcid } from "@/lib/front-matter";
import { ORCID_REGISTER_URL } from "@/lib/science-access";

/**
 * Card de identidade que o Pracinha abre no chat quando pergunta o ORCID.
 * O pesquisador digita o número (ou cria o seu) ali mesmo, sem sair da conversa.
 * Valida o dígito verificador localmente e só então libera o envio.
 */
export function OrcidPrompt({
  onSend,
  onDismiss,
  disabled,
}: {
  /** Envia a mensagem de volta ao Pracinha (o número ou "não tenho"). */
  onSend: (text: string) => void;
  /** Fecha o card sem responder. */
  onDismiss: () => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const normalized = useMemo(() => normalizeOrcid(value), [value]);
  const complete = (normalized?.replace(/-/g, "").length ?? 0) === 16;
  const valid = isValidOrcid(normalized);

  const submit = () => {
    if (!valid) return;
    onSend(`Meu ORCID é ${normalized}. Registre na identificação do trabalho.`);
  };

  return (
    <div className="orcid-card">
      <div className="flex items-start gap-2.5">
        <span className="orcid-card__seal" aria-hidden>
          <IdCard className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[0.9rem] font-semibold">Qual é o seu ORCID?</p>
          <p className="mt-0.5 text-[0.76rem] text-[var(--ci-soft)]">
            É o número que assina a sua autoria — pessoal, permanente e grátis. Cole aqui ou crie o
            seu em 3 minutos.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar"
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--ci-soft)] transition-colors hover:bg-black/5 hover:text-[var(--ci-ink)]"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="0000-0000-0000-0000"
            aria-label="Número do ORCID"
            className="orcid-card__input"
          />
          {valid && (
            <Check className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-success)]" />
          )}
        </div>
        <Button
          size="sm"
          className="h-10 shrink-0 gap-1.5"
          disabled={disabled || !valid}
          onClick={submit}
        >
          <Check className="size-4" />
          Usar este ORCID
        </Button>
      </div>

      {complete && !valid && (
        <p className="mt-1.5 text-[0.72rem] text-destructive">
          Esse número não passou na checagem do dígito. Confira os 16 dígitos (o último pode ser X).
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--ci-rule)] pt-2.5">
        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-[11px]">
          <a href={ORCID_REGISTER_URL} target="_blank" rel="noreferrer">
            <IdCard className="size-3.5" />
            Criar meu ORCID (grátis)
            <ExternalLink className="size-3" />
          </a>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-[11px]"
          disabled={disabled}
          onClick={() => onSend("Ainda não tenho ORCID — vou criar depois e sigo a entrevista.")}
        >
          Ainda não tenho
        </Button>
      </div>
    </div>
  );
}
