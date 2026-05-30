import { describe, it, expect } from "vitest";
import { computeForcePool } from "../../modules/rules/calculators/force-pool";

describe("computeForcePool", () => {
  it("returns the full pool when no dice are committed", () => {
    expect(computeForcePool({ maxForceRating: 5, committedDice: 0 })).toBe(5);
  });

  it("subtracts committed dice from the max", () => {
    expect(computeForcePool({ maxForceRating: 5, committedDice: 3 })).toBe(2);
  });

  it("floors at 0 when committed exceeds max", () => {
    expect(computeForcePool({ maxForceRating: 5, committedDice: 10 })).toBe(0);
  });

  it("returns 0 when max is 0", () => {
    expect(computeForcePool({ maxForceRating: 0, committedDice: 0 })).toBe(0);
  });

  it("coerces string-numeric inputs", () => {
    expect(computeForcePool({ maxForceRating: "5", committedDice: "2" })).toBe(3);
  });

  it("treats undefined or non-numeric inputs as 0", () => {
    expect(computeForcePool({ maxForceRating: undefined, committedDice: 0 })).toBe(0);
    expect(computeForcePool({ maxForceRating: 5, committedDice: undefined })).toBe(5);
    expect(computeForcePool({ maxForceRating: "abc", committedDice: 0 })).toBe(0);
  });
});
