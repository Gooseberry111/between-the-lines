import { describe, it, expect } from "vitest";
import { safeRedirect } from "../../src/lib/redirect";

describe("safeRedirect", () => {
  it("allows in-app paths", () => {
    expect(safeRedirect("/my-poems")).toBe("/my-poems");
    expect(safeRedirect("/poem/123?x=1")).toBe("/poem/123?x=1");
  });

  it("blocks anything that could leave the site", () => {
    expect(safeRedirect("//evil.example")).toBeNull();
    expect(safeRedirect("https://evil.example")).toBeNull();
    expect(safeRedirect("javascript:alert(1)")).toBeNull();
    expect(safeRedirect("")).toBeNull();
    expect(safeRedirect(undefined)).toBeNull();
    expect(safeRedirect(["/a"])).toBeNull();
  });
});
