import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { A4Sheet } from "@/components/app/A4Sheet";
import type { PlacedBlock } from "@/lib/a4";

const blocks: PlacedBlock[] = [
  { block: { type: "heading", level: 1, text: "Meu artigo" }, index: 0 },
  { block: { type: "paragraph", text: "Primeiro parágrafo do artigo." }, index: 1 },
];

describe("A4Sheet", () => {
  it("renders the blocks in reading mode", () => {
    render(
      <A4Sheet
        pageNumber={1}
        blocks={blocks}
        editing={false}
        sectionHighlight={null}
        onChangeBlock={() => {}}
        onDeleteBlock={() => {}}
      />,
    );
    expect(screen.getByText("Meu artigo")).toBeInTheDocument();
    expect(screen.getByText("Primeiro parágrafo do artigo.")).toBeInTheDocument();
    expect(screen.getByLabelText("Folha 1")).toBeInTheDocument();
  });

  it("edits a block in place and reports the new content", () => {
    const onChange = vi.fn();
    render(
      <A4Sheet
        pageNumber={1}
        blocks={blocks}
        editing
        sectionHighlight={null}
        onChangeBlock={onChange}
        onDeleteBlock={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Primeiro parágrafo do artigo."));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Parágrafo reescrito pelo pesquisador." } });
    fireEvent.click(screen.getByText("Salvar"));

    expect(onChange).toHaveBeenCalledWith(1, {
      type: "paragraph",
      text: "Parágrafo reescrito pelo pesquisador.",
    });
  });

  it("deletes a block through the editor", () => {
    const onDelete = vi.fn();
    render(
      <A4Sheet
        pageNumber={1}
        blocks={blocks}
        editing
        sectionHighlight={null}
        onChangeBlock={() => {}}
        onDeleteBlock={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("Meu artigo"));
    fireEvent.click(screen.getByText("Excluir bloco"));
    expect(onDelete).toHaveBeenCalledWith(0);
  });
});
