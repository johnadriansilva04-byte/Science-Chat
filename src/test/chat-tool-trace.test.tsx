import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// jsdom não implementa ResizeObserver; o Conversation usa (use-stick-to-bottom).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as never);

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/use-voice", () => ({
  useVoice: () => ({
    listening: false,
    speaking: false,
    sttSupported: false,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    stopSpeaking: vi.fn(),
  }),
}));

const { ChatDock } = await import("@/components/app/ChatDock");

/**
 * `display:flex` no `<summary>` remove o triângulo nativo do `<details>`. Sem a
 * seta, as fontes do RAG parecem um rótulo fixo e ninguém descobre que abrem.
 */
describe("ChatDock — rastro das bases públicas", () => {
  it("shows a visible affordance and reveals the sources on click", () => {
    render(
      <ChatDock
        articleId="art-1"
        phase="interview"
        onActivity={() => {}}
        onRequestPlan={() => {}}
        initialMessages={[
          { id: "1", role: "user", parts: [{ type: "text", text: "Sono e memória" }] },
          {
            id: "2",
            role: "assistant",
            parts: [
              { type: "text", text: "Vamos investigar isso." },
              {
                type: "tool-pesquisar_bases",
                toolCallId: "call-1",
                state: "output-available",
                input: { query: "sono memória de trabalho" },
                output: "1. Silva (2021) — Sono e memória de trabalho. SciELO.",
              },
            ],
          },
        ]}
      />,
    );

    const summary = screen.getByText("Resultados das bases públicas");
    const details = summary.closest("details");
    expect(details).not.toBeNull();

    // A seta é o que sinaliza que o bloco abre; sem ela o resumo é um beco sem saída.
    // Dois SVGs: o ícone da busca e a seta. O ícone sozinho não indica que abre.
    expect(details?.querySelectorAll("summary svg")).toHaveLength(2);

    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    expect(screen.getByText(/Sono e memória de trabalho/)).toBeInTheDocument();
  });
});
