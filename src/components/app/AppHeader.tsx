import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpenText, Landmark, Sparkles } from "lucide-react";
import { ArticlesMenu } from "@/components/app/ArticlesMenu";
import logo from "@/assets/sciencechat-logo.png";

const NAV = [
  { to: "/", label: "Início", icon: Sparkles },
  { to: "/museu", label: "Museu", icon: Landmark },
  { to: "/publicacoes", label: "Coletânea", icon: BookOpenText },
] as const;

/**
 * Cabeçalho único do produto. `overlay` flutua sobre o herói da home (fundo
 * transparente, sem borda); `solid` é a barra fixa das páginas internas.
 * A navegação é a mesma em todo lugar — a marca fica à esquerda, o menu de
 * artigos à direita.
 */
export function AppHeader({ variant = "solid" }: { variant?: "solid" | "overlay" }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const solid = variant === "solid";

  return (
    <header
      className={
        solid
          ? "sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md"
          : "relative z-10"
      }
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-6">
        <Link to="/" className="flex min-h-11 shrink-0 items-center gap-2">
          <img src={logo} alt="" width={28} height={28} />
          <span className="font-serif text-lg font-semibold tracking-tight">ScienceChat</span>
        </Link>

        <nav className="ml-auto flex items-center gap-0.5 text-sm">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className={`inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-full transition-colors sm:h-auto sm:w-auto sm:justify-start sm:px-3 sm:py-1.5 ${
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <ArticlesMenu />
        </nav>
      </div>
      {solid && (
        <div
          aria-hidden
          className="h-px w-full bg-gradient-to-r from-primary/50 via-primary/10 to-transparent"
        />
      )}
    </header>
  );
}
