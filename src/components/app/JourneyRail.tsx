import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOURNEY_ACTS, actAt, journeyIndex } from "@/lib/journey";

/**
 * O trilho da jornada científica: cinco atos (Ignição → Obra). O ato atual pulsa
 * e mostra a emoção do momento; os concluídos ganham check; os futuros esmaecem.
 * É a bússola emocional do workspace — onde você está e o que vem depois.
 */
export function JourneyRail({
  phase,
  approvedPages = 0,
  hasDraft = false,
  interviewRatio = 0,
  className,
}: {
  phase: string;
  approvedPages?: number;
  hasDraft?: boolean;
  interviewRatio?: number;
  className?: string;
}) {
  const current = journeyIndex({ phase, approvedPages, hasDraft, interviewRatio });
  const act = actAt(current);

  return (
    <div
      className={cn("journey-rail", className)}
      style={{ "--act": act.color } as React.CSSProperties}
    >
      <div className="journey-rail__track" aria-hidden>
        {JOURNEY_ACTS.map((a, i) => {
          const done = i < current;
          const now = i === current;
          const Icon = a.icon;
          return (
            <div
              key={a.id}
              className={cn(
                "journey-node",
                done && "journey-node--done",
                now && "journey-node--now",
              )}
            >
              <span
                className="journey-node__dot"
                style={{ "--dot": a.color } as React.CSSProperties}
              >
                {done ? <Check className="size-3" /> : <Icon className="size-3" />}
              </span>
              <span className="journey-node__label">{a.label}</span>
              {i < JOURNEY_ACTS.length - 1 && <span className="journey-node__link" />}
            </div>
          );
        })}
      </div>
      <p className="journey-rail__tagline" key={act.id}>
        {act.tagline}
      </p>
    </div>
  );
}
