import { useEffect, useState } from "react";
import { AlarmClock, Coffee } from "lucide-react";
import { PracinhaAvatar } from "@/components/app/PracinhaAvatar";
import { countdownLabel, formatResetTime, nextQuotaReset } from "@/lib/ai/quota";

/**
 * Quando a cota diária de neurônios da IA esgota, o Pracinha "se cansa": avisa que
 * vai estudar a tese e mostra um relógio com a hora em que volta (meia-noite UTC).
 * O chat fica travado até lá — com um botão para tentar mais cedo, caso a cota já
 * tenha sido renovada.
 */
export function PracinhaRest({
  resetAt,
  onRetry,
  retrying = false,
}: {
  resetAt?: number;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const target = resetAt ?? nextQuotaReset();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const back = target - now <= 0;

  return (
    <div className="m-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <PracinhaAvatar state="tired" size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">O Pracinha cansou 😴</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Acabaram os neurônios do dia. Vou descansar e estudar mais sobre a sua tese — amanhã
            volto com fôlego novo.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <AlarmClock className="size-4 text-primary" />
            <span className="text-sm">
              Volto às <strong>{formatResetTime(target)}</strong>
            </span>
            <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
              {countdownLabel(target, now)}
            </span>
          </div>
          {back ? (
            <p className="mt-2 text-xs text-success">
              Já é hora — seus neurônios foram renovados. Pode continuar!
            </p>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coffee className="size-3.5" /> O chat fica travado até o Pracinha voltar.
            </p>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="mt-3 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-accent disabled:opacity-60"
            >
              {retrying ? "Tentando…" : "Já voltou? Tentar de novo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
