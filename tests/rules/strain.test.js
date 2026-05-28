import { describe, it, expect } from "vitest";
import { computeStrainThreshold } from "../../modules/rules/calculators/strain.js";

describe("computeStrainThreshold", () => {
  it("sums base strain and willpower", () => {
    expect(computeStrainThreshold({ baseStrain: 10, willpower: 3 })).toBe(13);
  });

  it("adds modifiers when provided", () => {
    expect(computeStrainThreshold({ baseStrain: 10, willpower: 3, modifiers: 2 })).toBe(15);
  });

  it("returns 0 when all inputs are 0", () => {
    expect(computeStrainThreshold({ baseStrain: 0, willpower: 0 })).toBe(0);
  });

  it("coerces string-numeric inputs", () => {
    expect(computeStrainThreshold({ baseStrain: "10", willpower: "3" })).toBe(13);
  });

  it("treats undefined or non-numeric inputs as 0", () => {
    expect(computeStrainThreshold({ baseStrain: undefined, willpower: 3 })).toBe(3);
    expect(computeStrainThreshold({ baseStrain: "abc", willpower: 3 })).toBe(3);
    expect(computeStrainThreshold({ baseStrain: null, willpower: 3 })).toBe(3);
  });

  it("truncates fractional inputs", () => {
    expect(computeStrainThreshold({ baseStrain: 10.7, willpower: 3.4 })).toBe(13);
  });
});
