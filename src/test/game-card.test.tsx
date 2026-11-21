import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { GameCard } from "@/components/app/GameCard";
import { resolveGameUrl, STOP_CATEGORIES } from "@/lib/game";

describe("resolveGameUrl", () => {
  it("accepts an https URL and normalises it", () => {
    expect(resolveGameUrl("https://stop.example.com")).toBe("https://stop.example.com/");
  });

  it("rejects http, javascript: and garbage", () => {
    expect(resolveGameUrl("http://stop.example.com")).toBeNull();
    expect(resolveGameUrl("javascript:alert(1)")).toBeNull();
    expect(resolveGameUrl("nao-e-url")).toBeNull();
    expect(resolveGameUrl("")).toBeNull();
    expect(resolveGameUrl(undefined)).toBeNull();
  });
});

describe("GameCard", () => {
  const original = import.meta.env.VITE_GAME_URL;

  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.stubEnv("VITE_GAME_URL", original ?? "");
  });

  it("keeps the card visible but disabled when no game URL is configured", () => {
    vi.stubEnv("VITE_GAME_URL", "");
    render(<GameCard />);

    expect(screen.getByText("Stop científico")).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /em breve/i });
    expect(cta).toBeDisabled();
    expect(screen.queryByTitle("Stop científico")).not.toBeInTheDocument();
  });

  it("shows the science categories so the card explains itself", () => {
    vi.stubEnv("VITE_GAME_URL", "");
    render(<GameCard />);

    for (const category of STOP_CATEGORIES) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it("opens the embedded game in a dialog when the URL is set", () => {
    vi.stubEnv("VITE_GAME_URL", "https://stop.example.com/jogar");
    render(<GameCard />);

    fireEvent.click(screen.getByRole("button", { name: /jogar/i }));

    const frame = screen.getByTitle("Stop científico");
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute("src", "https://stop.example.com/jogar");
    expect(frame).toHaveAttribute("loading", "lazy");
  });

  it("ignores an insecure URL and stays in 'coming soon'", () => {
    vi.stubEnv("VITE_GAME_URL", "http://stop.example.com");
    render(<GameCard />);

    expect(screen.getByRole("button", { name: /em breve/i })).toBeDisabled();
  });
});
