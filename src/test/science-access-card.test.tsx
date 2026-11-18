import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScienceAccessCard, PRACINHA_ACCESS_SEED } from "@/components/app/ScienceAccessCard";
import {
  DIRECT_ANSWER_POINTS,
  ORCID_REGISTER_URL,
  SCIENCE_REFERENCES,
  SCIENCE_STEPS,
} from "@/lib/science-access";

describe("ScienceAccessCard", () => {
  it("mostra a chamada e abre o conteúdo ao clicar", () => {
    render(<ScienceAccessCard />);
    expect(screen.getByText("Ciência sem crachá")).toBeInTheDocument();
    // O conteúdo completo só aparece depois de abrir.
    expect(screen.queryByText("Passo a passo")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ciência sem crachá/i }));

    expect(screen.getByText("Passo a passo")).toBeInTheDocument();
    expect(screen.getByText("O que NÃO é exigido")).toBeInTheDocument();
    expect(screen.getByText("O que realmente conta")).toBeInTheDocument();
  });

  it("responde a pergunta do vínculo com provas e fontes", () => {
    render(<ScienceAccessCard />);
    fireEvent.click(screen.getByRole("button", { name: /ciência sem crachá/i }));

    expect(screen.getByText(/posso publicar/i)).toBeInTheDocument();
    for (const point of DIRECT_ANSWER_POINTS) {
      expect(screen.getByText(point.claim)).toBeInTheDocument();
    }
    // Cada ponto traz um link de fonte oficial.
    expect(screen.getAllByText(/^Fonte:/).length).toBe(DIRECT_ANSWER_POINTS.length);
  });

  it("lista todos os passos e todas as fontes oficiais", () => {
    render(<ScienceAccessCard />);
    fireEvent.click(screen.getByRole("button", { name: /ciência sem crachá/i }));

    for (const step of SCIENCE_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
    for (const ref of SCIENCE_REFERENCES) {
      const link = screen.getByText(ref.label).closest("a");
      expect(link).toHaveAttribute("href", ref.url);
    }
  });

  it("cobre Brasil e Uruguai nas abas de caminho", () => {
    render(<ScienceAccessCard />);
    fireEvent.click(screen.getByRole("button", { name: /ciência sem crachá/i }));
    expect(screen.getByRole("tab", { name: "Brasil" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Uruguai" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Internacional" })).toBeInTheDocument();
  });

  it("tem um botão direto para criar o ORCID (grátis, sem instituição)", () => {
    render(<ScienceAccessCard />);
    fireEvent.click(screen.getByRole("button", { name: /ciência sem crachá/i }));

    const orcid = screen.getByRole("link", { name: /criar meu orcid/i });
    expect(orcid).toHaveAttribute("href", ORCID_REGISTER_URL);
    expect(orcid).toHaveAttribute("target", "_blank");
    expect(orcid.getAttribute("rel")).toMatch(/noreferrer/);
  });

  it("leva o guia para o Pracinha quando o callback existe", () => {
    const onUseGuide = vi.fn();
    render(<ScienceAccessCard onUseGuide={onUseGuide} />);
    fireEvent.click(screen.getByRole("button", { name: /ciência sem crachá/i }));
    fireEvent.click(screen.getByRole("button", { name: /levar isso para o pracinha/i }));
    expect(onUseGuide).toHaveBeenCalledWith(PRACINHA_ACCESS_SEED);
  });
});
