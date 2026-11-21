import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// O card só usa `Link` do router; nos testes ele vira uma âncora comum, sem
// precisar montar um router inteiro (que resolveria de forma assíncrona).
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const { ScienceAccessCard } = await import("@/components/app/ScienceAccessCard");

describe("ScienceAccessCard (render)", () => {
  it("é um cartão com título, resposta curta e uma porta para o guia", () => {
    render(<ScienceAccessCard />);

    expect(screen.getByRole("heading", { name: "Ciência sem crachá" })).toBeInTheDocument();
    expect(screen.getByText(/não exige/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir o guia ciência sem crachá/i })).toHaveAttribute(
      "href",
      "/ciencia",
    );
  });

  // A ética é a única exceção ao "sem crachá" e precisa estar à vista: quem lê
  // a promessa tem de saber que pesquisa com seres humanos passa por comitê.
  it("mostra a exceção da ética sem abrir nada", () => {
    render(<ScienceAccessCard />);
    expect(screen.getByText(/pesquisa com seres humanos exige/i)).toBeInTheDocument();
  });

  // O boletim (listas, acordeões de etapas, abas por país) vive no guia. Se
  // voltar para o card, ele ocupa mais de uma tela da home outra vez.
  it("não despeja o guia na home: sem abas nem acordeões", () => {
    render(<ScienceAccessCard />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(document.querySelector("details")).toBeNull();
  });
});
