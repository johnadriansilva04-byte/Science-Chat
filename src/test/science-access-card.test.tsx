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

describe("ScienceAccessCard inline (home)", () => {
  it("ensina o fundamento SEM exigir clique", () => {
    render(<ScienceAccessCard inline />);
    // O conteúdo precisa estar à vista: quem chega com a dúvida não pode
    // precisar descobrir que o guia existe.
    expect(screen.getByText("Passo a passo")).toBeInTheDocument();
    expect(screen.getByText("O que NÃO é exigido")).toBeInTheDocument();
    expect(screen.getByText("O que realmente conta")).toBeInTheDocument();
    expect(screen.getByText(/posso publicar/i)).toBeInTheDocument();
    for (const point of DIRECT_ANSWER_POINTS) {
      expect(screen.getByText(point.claim)).toBeInTheDocument();
    }
  });

  it("destaca o ORCID com link gratuito e sem instituição", () => {
    render(<ScienceAccessCard inline />);
    const orcid = screen.getByRole("link", { name: /criar meu orcid/i });
    expect(orcid).toHaveAttribute("href", ORCID_REGISTER_URL);
  });

  it("mostra os primeiros passos e libera o resto sob demanda", () => {
    render(<ScienceAccessCard inline />);
    expect(screen.getByText(SCIENCE_STEPS[0]!.title)).toBeInTheDocument();
    expect(screen.queryByText(SCIENCE_STEPS[9]!.title)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ver os outros/i }));

    expect(screen.getByText(SCIENCE_STEPS[9]!.title)).toBeInTheDocument();
  });

  it("abre fontes, países e carta-modelo a partir do conteúdo visível", () => {
    render(<ScienceAccessCard inline />);
    fireEvent.click(screen.getByRole("button", { name: /fontes, países e carta-modelo/i }));

    expect(screen.getByRole("tab", { name: "Brasil" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Uruguai" })).toBeInTheDocument();
    for (const ref of SCIENCE_REFERENCES) {
      const link = screen.getByText(ref.label).closest("a");
      expect(link).toHaveAttribute("href", ref.url);
    }
  });
});
