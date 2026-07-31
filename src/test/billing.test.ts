import { describe, expect, it } from "vitest";

describe("billing plan keys", () => {
  it("recognises paid checkout plans", () => {
    const paid = new Set(["starter", "professional", "business"]);
    expect(paid.has("professional")).toBe(true);
    expect(paid.has("enterprise")).toBe(false);
  });
});
