import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScienceAtlas } from "@/components/app/ScienceAtlas";
import {
  COVER_LETTER_TEMPLATE,
  DIRECT_ANSWER_POINTS,
  ORCID_REGISTER_URL,
  SCIENCE_REFERENCES,
} from "@/lib/science-access";
import { SCIENCE_BITES } from "@/lib/science-flow";

describe("ScienceAtlas", () => {
  it("abre na pergunta que traz a pessoa e mostra as provas", () => {
    render(<ScienceAtlas />);
    expect(screen.getAllByText(/posso publicar sem vínculo\?/i).length).toBeGreaterThan(0);
    for (const point of DIRECT_ANSWER_POINTS) {
      expect(screen.getByText(point.question)).toBeInTheDocument();
      expect(screen.getByText(point.answer)).toBeInTheDocument();
    }
  });

  it("esconde os outros assuntos: só o escolhido é montado", () => {
    render(<ScienceAtlas />);
    expect(screen.queryByText(COVER_LETTER_TEMPLATE)).not.toBeInTheDocument();
    expect(screen.queryByText(SCIENCE_BITES[0]!.title)).not.toBeInTheDocument();
  });

  it("troca de assunto ao escolher outro tópico", () => {
    render(<ScienceAtlas />);
    fireEvent.click(screen.getByRole("tab", { name: /passo a passo/i }));
    expect(screen.getByText(SCIENCE_BITES[0]!.title)).toBeInTheDocument();
    expect(screen.queryByText(DIRECT_ANSWER_POINTS[0]!.question)).not.toBeInTheDocument();
  });

  it("mostra o ORCID com link gratuito em assunto próprio", () => {
    render(<ScienceAtlas />);
    fireEvent.click(screen.getByRole("tab", { name: /orcid/i }));
    const link = screen.getByRole("link", { name: /criar meu orcid/i });
    expect(link).toHaveAttribute("href", ORCID_REGISTER_URL);
  });

  // O ORCID é o primeiro passo concreto de quem não tem vínculo: o atalho
  // acompanha a dúvida em três lugares, não só na aba própria.
  it("repete o atalho do ORCID onde a dúvida aparece", () => {
    render(<ScienceAtlas />);
    expect(screen.getByRole("link", { name: /criar meu orcid/i })).toHaveAttribute(
      "href",
      ORCID_REGISTER_URL,
    );

    fireEvent.click(screen.getByRole("tab", { name: /passo a passo/i }));
    expect(screen.getByRole("link", { name: /criar meu orcid/i })).toHaveAttribute(
      "href",
      ORCID_REGISTER_URL,
    );
  });

  it("marca a aba do ORCID como gratuita", () => {
    render(<ScienceAtlas />);
    const tab = screen.getByRole("tab", { name: /orcid/i });
    expect(tab.textContent).toMatch(/grátis/i);
  });

  it("lista as fontes oficiais com link real", () => {
    render(<ScienceAtlas />);
    fireEvent.click(screen.getByRole("tab", { name: /fontes oficiais/i }));
    for (const ref of SCIENCE_REFERENCES) {
      expect(screen.getByText(ref.label).closest("a")).toHaveAttribute("href", ref.url);
    }
  });

  it("traz a carta ao editor para copiar", () => {
    render(<ScienceAtlas />);
    fireEvent.click(screen.getByRole("tab", { name: /carta ao editor/i }));
    expect(screen.getByText(/Submissão de artigo original/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar modelo/i })).toBeInTheDocument();
  });

  it("cobre Brasil e Uruguai no assunto de países", () => {
    render(<ScienceAtlas />);
    fireEvent.click(screen.getByRole("tab", { name: /brasil e uruguai/i }));
    expect(screen.getByText(/Currículo Lattes/i)).toBeInTheDocument();
    expect(screen.getByText(/CVUy/i)).toBeInTheDocument();
  });
});
