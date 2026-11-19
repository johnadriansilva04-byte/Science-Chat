import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// jsdom não implementa ResizeObserver; o Conversation usa (use-stick-to-bottom).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as never);

const sendMessage = vi.fn();
let status = "ready";

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({ messages: [], sendMessage, status, stop: vi.fn() }),
}));

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

const renderDock = () =>
  render(
    <ChatDock
      articleId="art-1"
      initialMessages={[]}
      phase="interview"
      onActivity={() => {}}
      onRequestPlan={() => {}}
    />,
  );

describe("ChatDock composer", () => {
  beforeEach(() => {
    sendMessage.mockClear();
    status = "ready";
  });

  it("envia o texto quando está livre", async () => {
    renderDock();
    const box = screen.getByPlaceholderText("Escreva sua resposta...");
    fireEvent.change(box, { target: { value: "minha resposta" } });
    fireEvent.submit(box.closest("form")!);
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith({ text: "minha resposta" }));
  });

  it("não perde o texto digitado durante a resposta", async () => {
    status = "streaming";
    renderDock();
    const box = screen.getByPlaceholderText("Escreva sua resposta...") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "digitado enquanto pensa" } });
    fireEvent.submit(box.closest("form")!);
    await waitFor(() => expect(box.value).toBe("digitado enquanto pensa"));
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
