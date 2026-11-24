import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GameCard } from "@/components/app/GameCard";
import { GAME_PATH, STOP_CATEGORIES } from "@/lib/game";

describe("GameCard", () => {
  it("anuncia o Stop científico com as categorias", () => {
    render(<GameCard />);

    expect(screen.getByText("Stop científico")).toBeInTheDocument();
    for (const category of STOP_CATEGORIES) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
    expect(screen.getByText(/5 campanhas/i)).toBeInTheDocument();
  });

  it("leva para a campanha interna, sem iframe", () => {
    render(<GameCard />);

    const cta = screen.getByRole("link", { name: /jogar/i });
    expect(cta).toHaveAttribute("href", GAME_PATH);
    expect(screen.queryByTitle("Stop científico")).not.toBeInTheDocument();
  });
});
