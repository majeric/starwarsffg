import { describe, it, expect } from "vitest";
import { computeDefense } from "../../modules/rules/calculators/defense.js";

describe("computeDefense", () => {
  it("returns 0 with empty items and no base", () => {
    expect(computeDefense([])).toBe(0);
  });

  it("returns base when no items", () => {
    expect(computeDefense([], 1)).toBe(1);
  });

  it("sums ALL items' defence.adjusted (preserves legacy quirk; not highest-only)", () => {
    const items = [
      { system: { defence: { adjusted: 1 } } },
      { system: { defence: { adjusted: 1 } } },
    ];
    expect(computeDefense(items)).toBe(2);
  });

  it("adds base and modifiers to the items' sum", () => {
    const items = [
      { system: { defence: { adjusted: 2 } } },
      { system: { defence: { adjusted: 3 } } },
    ];
    expect(computeDefense(items, 1, 1)).toBe(7);
  });

  it("ignores items missing defence", () => {
    const items = [
      { system: { defence: { adjusted: 2 } } },
      { system: {} },
    ];
    expect(computeDefense(items)).toBe(2);
  });

  it("coerces string-numeric inputs", () => {
    const items = [{ system: { defence: { adjusted: "2" } } }];
    expect(computeDefense(items, "1", "1")).toBe(4);
  });
});
