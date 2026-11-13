import { cn } from "@/lib/utils";

export type PracinhaState = "idle" | "thinking" | "writing" | "done" | "tired";

/**
 * Marca do assistente: um selo circular com a inicial e um anel pulsante que muda
 * conforme o estado (ocioso, pensando, escrevendo). É puramente decorativo, então
 * fica fora da árvore de acessibilidade.
 */
export function PracinhaAvatar({
  state = "idle",
  size = 32,
  className,
}: {
  state?: PracinhaState;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("pracinha-avatar", `pracinha-avatar--${state}`, className)}
      style={{ width: size, height: size }}
    >
      <span className="pracinha-avatar__ring" />
      <span className="pracinha-avatar__core" style={{ fontSize: size * 0.44 }}>
        P
      </span>
    </span>
  );
}
