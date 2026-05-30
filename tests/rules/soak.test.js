import { describe, it, expect } from "vitest";
import { computeSoak } from "../../modules/rules/calculators/soak";

describe("computeSoak", () => {
  it("returns brawn when no armour or modifiers", () => {
    expect(computeSoak({ brawn: 3 })).toBe(3);
  });

  it("adds equipped armour soak to brawn", () => {
    expect(computeSoak({ brawn: 3, equippedArmourSoak: 2 })).toBe(5);
  });

  it("adds modifiers on top of brawn and armour", () => {
    expect(computeSoak({ brawn: 3, equippedArmourSoak: 2, modifiers: 1 })).toBe(6);
  });

  it("coerces string-numeric inputs", () => {
    expect(computeSoak({ brawn: "3", equippedArmourSoak: "2" })).toBe(5);
  });

  it("treats undefined or non-numeric values as 0", () => {
    expect(computeSoak({ brawn: undefined, equippedArmourSoak: 2 })).toBe(2);
    expect(computeSoak({ brawn: "abc", equippedArmourSoak: 2 })).toBe(2);
  });

  it("returns 0 when every input is 0", () => {
    expect(computeSoak({ brawn: 0, equippedArmourSoak: 0, modifiers: 0 })).toBe(0);
  });
});
