import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PracinhaRest } from "@/components/app/PracinhaRest";

describe("PracinhaRest", () => {
  it("offers the game card while the AI quota is exhausted", () => {
    render(<PracinhaRest resetAt={Date.now() + 3_600_000} />);

    expect(screen.getByText("O Pracinha cansou 😴")).toBeInTheDocument();
    // A espera é o momento certo para o joguinho: ele não aparece na produção do artigo.
    expect(screen.getByRole("heading", { name: /stop científico/i })).toBeInTheDocument();
  });
});
