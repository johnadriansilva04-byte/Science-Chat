import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InterviewMapRow } from "@/components/app/InterviewMapRow";

describe("InterviewMapRow", () => {
  it("não renderiza nada sem seções", () => {
    const { container } = render(<InterviewMapRow sections={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra o estado de cada seção em texto, não só em cor", () => {
    render(
      <InterviewMapRow
        sections={[
          { section: "Introdução", state: "answered" },
          { section: "Metodologia", state: "current" },
          { section: "Conclusão", state: "open" },
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: /mapa da entrevista/i });
    expect(list).toBeInTheDocument();
    expect(screen.getByLabelText("Introdução: respondida")).toBeInTheDocument();
    expect(screen.getByLabelText("Metodologia: perguntando agora")).toBeInTheDocument();
    expect(screen.getByLabelText("Conclusão: em aberto")).toBeInTheDocument();
  });
});
