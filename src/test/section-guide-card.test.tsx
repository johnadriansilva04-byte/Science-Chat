import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionGuideCard } from "@/components/app/SectionGuideCard";
import { SECTION_GUIDE } from "@/lib/section-guide";

describe("SectionGuideCard", () => {
  it("começa recolhido e revela o guia completo ao expandir", () => {
    render(<SectionGuideCard />);
    expect(screen.getByText("Como cada parte funciona")).toBeInTheDocument();
    // Recolhido: o guia detalhado não aparece.
    expect(screen.queryByText("Título")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /como cada parte funciona/i }));

    expect(screen.getByText("Título")).toBeInTheDocument();
    expect(screen.getByText(/porta de entrada/i)).toBeInTheDocument();
    // Um bloco "Ex.:" por parte do guia.
    expect(screen.getAllByText(/^Ex\.:/)).toHaveLength(SECTION_GUIDE.length);
  });

  it("deixa claro que as escolhas autorais são do pesquisador", () => {
    render(<SectionGuideCard />);
    expect(screen.getByText(/escolhas/)).toBeInTheDocument();
    expect(screen.getByText("suas")).toBeInTheDocument();
  });
});
