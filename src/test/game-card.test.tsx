import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GameCard } from "@/components/app/GameCard";
import { GAME_PATH } from "@/lib/game";

function round(container: HTMLElement) {
  return [...container.querySelectorAll(".stop-card__cats li")].map((node) => node.textContent);
}

describe("GameCard", () => {
  it("mostra uma rodada de exemplo em vez de listar os 24 campos", () => {
    const { container } = render(<GameCard visit={0} />);

    expect(screen.getByRole("heading", { name: /stop científico/i })).toBeInTheDocument();
    expect(round(container)).toHaveLength(4);
    expect(screen.getByText(/5 campanhas/i)).toBeInTheDocument();
    expect(screen.getByText("Clássico")).toBeInTheDocument();
  });

  it("muda a rodada a cada visita", () => {
    const first = render(<GameCard visit={0} />);
    const second = render(<GameCard visit={1} />);

    expect(round(first.container)).not.toEqual(round(second.container));
    first.unmount();
    second.unmount();
  });

  it("sorteia outra rodada ao embaralhar", () => {
    const { container } = render(<GameCard visit={0} />);
    const before = round(container);

    fireEvent.click(screen.getByRole("button", { name: /sortear outra rodada/i }));

    expect(round(container)).not.toEqual(before);
  });

  it("leva para a campanha interna, sem iframe", () => {
    render(<GameCard />);

    const cta = screen.getByRole("link", { name: /jogar/i });
    expect(cta).toHaveAttribute("href", GAME_PATH);
    expect(screen.queryByTitle("Stop científico")).not.toBeInTheDocument();
  });
});
