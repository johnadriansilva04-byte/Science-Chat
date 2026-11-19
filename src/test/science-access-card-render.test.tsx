import { fireEvent, render, screen, within } from "@testing-library/react";
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
const { referencesByRegion } = await import("@/lib/science-access");

const panel = () => screen.getByRole("tabpanel");

describe("ScienceAccessCard (render)", () => {
  it("troca de região ao clicar nas abas", () => {
    render(<ScienceAccessCard />);

    expect(within(panel()).getByText("Plataforma Lattes (CNPq)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Uruguai (Udelar)" }));
    expect(within(panel()).getByText("SciELO Uruguay")).toBeInTheDocument();
    expect(within(panel()).queryByText("Plataforma Lattes (CNPq)")).not.toBeInTheDocument();
    for (const ref of referencesByRegion("uruguai")) {
      expect(within(panel()).getByText(ref.label)).toBeInTheDocument();
    }
  });

  it("navega entre as abas com as setas do teclado", () => {
    render(<ScienceAccessCard />);
    const brasil = screen.getByRole("tab", { name: "Brasil" });
    expect(brasil).toHaveAttribute("aria-selected", "true");
    expect(brasil).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(brasil, { key: "ArrowRight" });
    const uruguai = screen.getByRole("tab", { name: "Uruguai (Udelar)" });
    expect(uruguai).toHaveAttribute("aria-selected", "true");
    expect(brasil).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(uruguai, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Brasil" })).toHaveAttribute("aria-selected", "true");
  });

  it("liga cada aba ao painel por aria-controls/aria-labelledby", () => {
    render(<ScienceAccessCard />);
    const brasil = screen.getByRole("tab", { name: "Brasil" });
    expect(brasil).toHaveAttribute("aria-controls", panel().id);
    expect(panel()).toHaveAttribute("aria-labelledby", brasil.id);
  });

  it("a variante compacta é só a porta para o guia", () => {
    render(<ScienceAccessCard variant="compact" />);
    expect(screen.getByRole("link", { name: /Ciência sem crachá/ })).toHaveAttribute(
      "href",
      "/ciencia",
    );
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
