import { describe, expect, it } from "vitest";
import { INTERVIEW_MODEL, DEFAULT_MODEL, interviewModelId } from "@/lib/ai/gateway.server";

describe("modelos", () => {
  it("entrevista usa modelo mais barato que o de produção", () => {
    expect(INTERVIEW_MODEL).not.toBe(DEFAULT_MODEL);
    expect(INTERVIEW_MODEL).toContain("8b");
    expect(DEFAULT_MODEL).toContain("70b");
  });
  it("permite override", () => {
    process.env["AI_INTERVIEW_MODEL"] = "@cf/meta/llama-3.2-3b-instruct";
    expect(interviewModelId()).toBe("@cf/meta/llama-3.2-3b-instruct");
    delete process.env["AI_INTERVIEW_MODEL"];
    expect(interviewModelId()).toBe(INTERVIEW_MODEL);
  });
});
