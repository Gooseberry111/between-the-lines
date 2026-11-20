import { describe, it, expect } from "vitest";
import {
  stanzas,
  excerptLines,
  wordCount,
  lineCount,
  readMinutes,
  decorate,
} from "../../src/lib/poemText";

const POEM = "I keep the kettle singing\nas if warmth could be stored\n\nOutside, the lamp hums\n\n\nInside, I learn";

describe("stanzas", () => {
  it("splits on blank lines and drops empty ones", () => {
    expect(stanzas(POEM)).toEqual([
      ["I keep the kettle singing", "as if warmth could be stored"],
      ["Outside, the lamp hums"],
      ["Inside, I learn"],
    ]);
  });

  it("treats whitespace-only lines as stanza breaks", () => {
    expect(stanzas("a\n   \nb")).toEqual([["a"], ["b"]]);
  });

  it("handles empty input", () => {
    expect(stanzas("")).toEqual([]);
    expect(stanzas()).toEqual([]);
  });
});

describe("excerptLines", () => {
  it("takes the opening of the first stanza only", () => {
    expect(excerptLines(POEM, 4)).toEqual(["I keep the kettle singing", "as if warmth could be stored"]);
    expect(excerptLines(POEM, 1)).toEqual(["I keep the kettle singing"]);
  });
});

describe("counts", () => {
  it("counts words and non-empty lines", () => {
    expect(wordCount("one two  three\nfour")).toBe(4);
    expect(lineCount(POEM)).toBe(4);
  });

  it("never reports less than a minute to read", () => {
    expect(readMinutes("short")).toBe(1);
    expect(readMinutes(Array(360).fill("word").join(" "))).toBe(3);
  });
});

describe("decorate", () => {
  it("adds preview fields without losing the original ones", () => {
    const poem = decorate({ id: "p1", title: "T", body: POEM });
    expect(poem.id).toBe("p1");
    expect(poem.preview).toBe("I keep the kettle singing");
    expect(poem.excerpt).toHaveLength(2);
    expect(poem.readMinutes).toBe(1);
  });

  it("copes with a missing body", () => {
    expect(decorate({ id: "x" }).preview).toBe("");
  });
});
