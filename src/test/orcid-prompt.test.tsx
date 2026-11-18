import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OrcidPrompt } from "@/components/app/OrcidPrompt";
import { ORCID_REGISTER_URL } from "@/lib/science-access";

describe("OrcidPrompt", () => {
  it("só libera o envio com um ORCID válido", () => {
    const onSend = vi.fn();
    render(<OrcidPrompt onSend={onSend} onDismiss={vi.fn()} />);

    const button = screen.getByRole("button", { name: /usar este orcid/i });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/número do orcid/i), {
      target: { value: "0000-0002-1825-0098" },
    });
    expect(button).toBeDisabled();
    expect(screen.getByText(/não passou na checagem do dígito/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/número do orcid/i), {
      target: { value: "0000000218250097" },
    });
    expect(button).toBeEnabled();
  });

  it("envia o ORCID normalizado ao Pracinha", () => {
    const onSend = vi.fn();
    render(<OrcidPrompt onSend={onSend} onDismiss={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/número do orcid/i), {
      target: { value: "0000 0002 1825 0097" },
    });
    fireEvent.click(screen.getByRole("button", { name: /usar este orcid/i }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]?.[0]).toContain("0000-0002-1825-0097");
  });

  it("leva ao registro oficial do ORCID e permite seguir sem ele", () => {
    const onSend = vi.fn();
    render(<OrcidPrompt onSend={onSend} onDismiss={vi.fn()} />);

    expect(screen.getByRole("link", { name: /criar meu orcid/i })).toHaveAttribute(
      "href",
      ORCID_REGISTER_URL,
    );

    fireEvent.click(screen.getByRole("button", { name: /ainda não tenho/i }));
    expect(onSend).toHaveBeenCalledWith(expect.stringMatching(/ainda não tenho orcid/i));
  });

  it("aceita o dígito verificador X (última posição)", () => {
    const onSend = vi.fn();
    render(<OrcidPrompt onSend={onSend} onDismiss={vi.fn()} />);

    const button = screen.getByRole("button", { name: /usar este orcid/i });
    fireEvent.change(screen.getByLabelText(/número do orcid/i), {
      target: { value: "000000000000001X" },
    });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onSend.mock.calls[0]?.[0]).toContain("0000-0000-0000-001X");
  });

  it("fecha sem responder quando o pesquisador dispensa", () => {
    const onDismiss = vi.fn();
    render(<OrcidPrompt onSend={vi.fn()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /fechar/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
