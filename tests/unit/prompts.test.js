import { describe, it, expect } from "vitest";
import { PROMPTS, promptOfTheDay, randomPrompt } from "../../src/lib/prompts";

describe("prompts", () => {
  it("gives everyone the same prompt on the same day", () => {
    const day = new Date(2026, 10, 20, 9);
    expect(promptOfTheDay(day)).toBe(promptOfTheDay(new Date(2026, 10, 20, 23)));
  });

  it("changes from one day to the next", () => {
    expect(promptOfTheDay(new Date(2026, 10, 20))).not.toBe(promptOfTheDay(new Date(2026, 10, 21)));
  });

  it("shuffle never repeats the current prompt", () => {
    for (let i = 0; i < 50; i++) {
      const current = PROMPTS[i % PROMPTS.length];
      expect(randomPrompt(current)).not.toBe(current);
    }
  });
});
