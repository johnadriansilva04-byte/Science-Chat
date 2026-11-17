import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BookReader } from "@/components/app/BookReader";
import { ARTICLE_SIGNATURE } from "@/lib/article-export";

const pages = [
  { page_number: 1, content: "# Meu artigo\n\nPrimeira página.", status: "approved" },
  { page_number: 2, content: "## Seção\n\nSegunda página.", status: "approved" },
  { page_number: 3, content: "Rascunho ignorado.", status: "draft" },
];

describe("BookReader", () => {
  it("opens on the cover and navigates to approved pages only", () => {
    render(<BookReader title="Meu artigo" pages={pages} onClose={() => {}} />);

    expect(screen.getByText("Artigo científico")).toBeInTheDocument();
    expect(screen.getByText("1 / 4")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Próxima página"));
    expect(screen.getByText(/Primeira página/)).toBeInTheDocument();
    expect(screen.getByText("2 / 4")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Próxima página"));
    expect(screen.getByText(/Segunda página/)).toBeInTheDocument();
    expect(screen.queryByText(/Rascunho ignorado/)).not.toBeInTheDocument();
  });

  it("ends with the Variant signature and closes on Escape", () => {
    const onClose = vi.fn();
    render(<BookReader title="Meu artigo" pages={pages} onClose={onClose} />);

    const dots = screen.getAllByLabelText(/Ir para a folha/);
    const lastDot = dots[dots.length - 1];
    expect(lastDot).toBeDefined();
    if (lastDot) fireEvent.click(lastDot);
    expect(screen.getByText(ARTICLE_SIGNATURE)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("abre o conteúdo integral (publicação) dividido por seções", () => {
    render(
      <BookReader
        title="Ensaio"
        content={"# Ensaio\n\nAbertura.\n\n## Introdução\n\nUm.\n\n## Conclusão\n\nFim."}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("1 / 5")).toBeInTheDocument(); // capa + 3 seções + assinatura
    fireEvent.click(screen.getByLabelText("Próxima página"));
    expect(screen.getByText(/Abertura/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Próxima página"));
    expect(screen.getByText(/Um\./)).toBeInTheDocument();
  });

  it("nunca corta a folha: rola no overlay e na própria folha", () => {
    render(<BookReader title="Meu artigo" pages={pages} onClose={() => {}} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("overflow-y-auto");
    expect(dialog.className).not.toContain("overflow-hidden");

    // A folha longa tem altura máxima e rolagem própria, em vez de recortar o texto.
    const leaf = dialog.querySelector("article");
    expect(leaf?.className).toContain("max-h-[82vh]");
    expect(leaf?.className).toContain("overflow-y-auto");
  });
});
