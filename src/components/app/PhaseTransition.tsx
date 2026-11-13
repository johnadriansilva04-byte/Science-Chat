import { useEffect, useState } from "react";
import { actAt } from "@/lib/journey";

/**
 * Cortina emocional entre atos: quando a fase muda (entrevista → plano → escrita →
 * concluído), um overlay breve anuncia o novo ato com a sua cor e a sua frase.
 * Aparece uma vez por mudança e não bloqueia a interação.
 */
export function PhaseTransition({ index }: { index: number }) {
  const [shown, setShown] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shown === null) {
      setShown(index);
      return;
    }
    if (index === shown) return;
    setShown(index);
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(t);
  }, [index, shown]);

  const act = actAt(index);
  if (!visible) return null;
  const Icon = act.icon;

  return (
    <div
      className="phase-curtain"
      style={{ "--act": act.color } as React.CSSProperties}
      role="status"
      aria-live="polite"
    >
      <div className="phase-curtain__card">
        <span className="phase-curtain__icon">
          <Icon className="size-5" />
        </span>
        <p className="phase-curtain__act">{act.label}</p>
        <p className="phase-curtain__welcome">{act.welcome}</p>
      </div>
    </div>
  );
}
