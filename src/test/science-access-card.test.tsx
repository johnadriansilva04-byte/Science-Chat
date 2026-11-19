import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScienceAccessCard, PRACINHA_ACCESS_SEED } from "@/components/app/ScienceAccessCard";
import {
  DIRECT_ANSWER_POINTS,
  ORCID_REGISTER_URL,
  SCIENCE_REFERENCES,
  SCIENCE_STEPS,
} from "@/lib/science-access";
import { SCIENCE_BITES, SCIENCE_BITES_TOTAL } from "@/lib/science-flow";

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
  it("responde a dúvida SEM exigir clique", () => {
    render(<ScienceAccessCard inline />);
    // Quem chega com "posso publicar sem vínculo?" precisa da resposta à vista.
    expect(screen.getByText(/posso publicar/i)).toBeInTheDocument();
    for (const point of DIRECT_ANSWER_POINTS) {
      expect(screen.getByText(point.claim)).toBeInTheDocument();
    }
    expect(screen.getByText("O que NÃO é exigido")).toBeInTheDocument();
    expect(screen.getByText("O que realmente conta")).toBeInTheDocument();
  });

  it("não despeja o caminho inteiro: entrega em partes", () => {
    render(<ScienceAccessCard inline />);
    expect(screen.getByText("O caminho, em partes")).toBeInTheDocument();
    // Só o primeiro bocado aparece; o resto vem sob demanda.
    expect(screen.getByText(SCIENCE_BITES[0]!.title)).toBeInTheDocument();
    for (const bite of SCIENCE_BITES.slice(1)) {
      expect(screen.queryByText(bite.title)).not.toBeInTheDocument();
    }
  });

  it("avança um bocado por vez até o fim", () => {
    render(<ScienceAccessCard inline />);
    expect(screen.getByText(`1 de ${SCIENCE_BITES_TOTAL}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByText(SCIENCE_BITES[1]!.title)).toBeInTheDocument();
    expect(screen.queryByText(SCIENCE_BITES[0]!.title)).not.toBeInTheDocument();

    for (let i = 2; i < SCIENCE_BITES_TOTAL; i++) {
      fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    }
    expect(screen.getByText(SCIENCE_BITES[SCIENCE_BITES_TOTAL - 1]!.title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rever do começo/i })).toBeInTheDocument();
  });

  it("ensina o porquê e o para-que-serve de cada parte", () => {
    render(<ScienceAccessCard inline />);
    const first = SCIENCE_BITES[0]!;
    expect(screen.getByText("Por que importa")).toBeInTheDocument();
    expect(screen.getByText("Para que serve")).toBeInTheDocument();
    expect(screen.getByText(first.why)).toBeInTheDocument();
    expect(screen.getByText(first.whatFor)).toBeInTheDocument();
  });

  it("destaca o ORCID com link gratuito e sem instituição", () => {
    render(<ScienceAccessCard inline />);
    const orcid = screen.getByRole("link", { name: /criar meu orcid/i });
    expect(orcid).toHaveAttribute("href", ORCID_REGISTER_URL);
  });

  it("guarda o aprofundamento (fontes, países, carta) num diálogo", () => {
    render(<ScienceAccessCard inline />);
    // Os 10 passos completos vivem no modo não-inline (publicações/museu); aqui
    // o diálogo entrega o que o bocado não mostra: fontes por país e carta-modelo.
    expect(screen.queryByRole("tab", { name: "Brasil" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /fontes, países e carta-modelo/i }));
    expect(screen.getByRole("tab", { name: "Brasil" })).toBeInTheDocument();
    expect(screen.getByText(SCIENCE_REFERENCES[0]!.label)).toBeInTheDocument();
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
