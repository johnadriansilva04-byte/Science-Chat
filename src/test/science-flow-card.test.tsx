import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ScienceFlowCard } from "@/components/app/ScienceFlowCard";
import {
  SCIENCE_BITES,
  SCIENCE_BITES_TOTAL,
  SCIENCE_FLOW_IDLE,
  advanceScienceFlow,
  startScienceFlow,
  type ScienceFlowState,
} from "@/lib/science-flow";

const noop = () => {};

function renderCard(
  state: ScienceFlowState,
  overrides: Partial<Parameters<typeof ScienceFlowCard>[0]> = {},
) {
  const props = {
    state,
    onStart: vi.fn(),
    onNext: vi.fn(),
    onDismiss: vi.fn(),
    onCreate: vi.fn(),
    onCreateFromScratch: vi.fn(),
    ...overrides,
  };
  render(<ScienceFlowCard {...props} />);
  return props;
}

describe("ScienceFlowCard — oferecer antes de ensinar", () => {
  it("a oferta é um convite curto, sem despejar o caminho", () => {
    renderCard({ stage: "offered", index: 0 });
    expect(screen.getByText("Ciência sem crachá")).toBeInTheDocument();
    // Nenhum bocado visível antes do "sim".
    for (const bite of SCIENCE_BITES) {
      expect(screen.queryByText(bite.title)).not.toBeInTheDocument();
    }
  });

  it("só o botão de começar dispara o fluxo", () => {
    const props = renderCard({ stage: "offered", index: 0 });
    fireEvent.click(screen.getByRole("button", { name: /ver o caminho/i }));
    expect(props.onStart).toHaveBeenCalledTimes(1);
    expect(props.onNext).not.toHaveBeenCalled();
  });

  it("permite recusar sem culpa", () => {
    const props = renderCard({ stage: "offered", index: 0 });
    fireEvent.click(screen.getByRole("button", { name: /agora não/i }));
    expect(props.onDismiss).toHaveBeenCalled();
  });
});

describe("ScienceFlowCard — um bocado por vez", () => {
  it("mostra SÓ o primeiro bocado, nunca a lista inteira", () => {
    renderCard(startScienceFlow());
    expect(screen.getByText(SCIENCE_BITES[0]!.title)).toBeInTheDocument();
    for (const bite of SCIENCE_BITES.slice(1)) {
      expect(screen.queryByText(bite.title)).not.toBeInTheDocument();
    }
  });

  it("ensina o quê, o porquê e o para-que-serve", () => {
    renderCard(startScienceFlow());
    const first = SCIENCE_BITES[0]!;
    expect(screen.getByText(first.what)).toBeInTheDocument();
    expect(screen.getByText(first.why)).toBeInTheDocument();
    expect(screen.getByText(first.whatFor)).toBeInTheDocument();
    expect(screen.getByText("Por que importa")).toBeInTheDocument();
    expect(screen.getByText("Para que serve")).toBeInTheDocument();
  });

  it("mostra a posição no caminho", () => {
    renderCard(startScienceFlow());
    expect(screen.getByText(`1 de ${SCIENCE_BITES_TOTAL}`)).toBeInTheDocument();
  });

  it("avança um por vez e troca o rótulo no fim", () => {
    let state = startScienceFlow();
    for (let i = 0; i < SCIENCE_BITES_TOTAL - 1; i++) state = advanceScienceFlow(state);
    const props = renderCard(state);
    expect(screen.getByText(SCIENCE_BITES[SCIENCE_BITES_TOTAL - 1]!.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /concluir/i }));
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });

  it("no passo do ORCID oferece o cadastro gratuito", () => {
    let state = startScienceFlow();
    state = advanceScienceFlow(advanceScienceFlow(state));
    renderCard(state);
    const link = screen.getByRole("link", { name: /criar meu orcid/i });
    expect(link).toHaveAttribute("href", "https://orcid.org/register");
  });

  it("não mostra o link do ORCID fora do passo dele", () => {
    renderCard(startScienceFlow());
    expect(screen.queryByRole("link", { name: /criar meu orcid/i })).not.toBeInTheDocument();
  });
});

describe("ScienceFlowCard — o card de criação só no fim", () => {
  it("durante o caminho não há convite para criar", () => {
    renderCard(startScienceFlow());
    expect(screen.queryByRole("button", { name: /começar meu artigo/i })).not.toBeInTheDocument();
  });

  it("ao concluir, oferece criar o artigo", () => {
    const props = renderCard({ stage: "finished", index: SCIENCE_BITES_TOTAL - 1 });
    fireEvent.click(screen.getByRole("button", { name: /começar meu artigo/i }));
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it("e deixa seguir com outra ideia", () => {
    const props = renderCard({ stage: "finished", index: SCIENCE_BITES_TOTAL - 1 });
    fireEvent.click(screen.getByRole("button", { name: /tenho outra ideia/i }));
    expect(props.onCreateFromScratch).toHaveBeenCalledTimes(1);
  });

  it("não oferece criar enquanto o Pracinha descansa", () => {
    renderCard({ stage: "finished", index: SCIENCE_BITES_TOTAL - 1 }, { canCreate: false });
    expect(screen.queryByRole("button", { name: /começar meu artigo/i })).not.toBeInTheDocument();
    expect(screen.getByText(/quando eu acordar/i)).toBeInTheDocument();
  });

  it("não renderiza nada em idle", () => {
    const { container } = render(
      <ScienceFlowCard
        state={SCIENCE_FLOW_IDLE}
        onStart={noop}
        onNext={noop}
        onDismiss={noop}
        onCreate={noop}
        onCreateFromScratch={noop}
      />,
    );
    // Em idle o ChatDock nem monta o card; aqui garantimos que não vaza conteúdo.
    expect(container.querySelector(".ciencia-chat-card--done")).toBeNull();
  });
});
