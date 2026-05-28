import { describe, it, expect } from "vitest";
import { computeWoundThreshold } from "../../modules/rules/calculators/wounds.js";

describe("computeWoundThreshold", () => {
  it("sums base wounds and brawn", () => {
    expect(computeWoundThreshold({ baseWounds: 10, brawn: 2 })).toBe(12);
  });

  it("adds modifiers when provided", () => {
    expect(computeWoundThreshold({ baseWounds: 10, brawn: 2, modifiers: 3 })).toBe(15);
  });

  it("returns 0 when all inputs are 0", () => {
    expect(computeWoundThreshold({ baseWounds: 0, brawn: 0 })).toBe(0);
  });

  it("coerces string-numeric inputs", () => {
    expect(computeWoundThreshold({ baseWounds: "10", brawn: "2" })).toBe(12);
  });

  it("treats undefined or non-numeric inputs as 0", () => {
    expect(computeWoundThreshold({ baseWounds: undefined, brawn: 2 })).toBe(2);
    expect(computeWoundThreshold({ baseWounds: "abc", brawn: 2 })).toBe(2);
    expect(computeWoundThreshold({ baseWounds: null, brawn: 2 })).toBe(2);
  });

  it("truncates fractional inputs (matches integer-only legacy)", () => {
    expect(computeWoundThreshold({ baseWounds: 10.7, brawn: 2.4 })).toBe(12);
  });
});
