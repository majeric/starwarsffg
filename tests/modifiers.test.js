import { describe, expect, it } from "vitest";
import ModifierHelpers from "../modules/helpers/modifiers.js";

describe("Modifier Helpers", () => {
  it("delegates characteristic expansion to the canonical modifier map", () => {
    expect(ModifierHelpers.explodeMod("Characteristic", "Brawn")).toEqual([
      { modType: "Characteristic", mod: "Brawn" },
      { modType: "Characteristic", mod: "EncumbranceMax" },
      { modType: "Stat", mod: "Soak" },
    ]);
  });

  it("delegates modifier path lookups to the canonical modifier map", () => {
    expect(ModifierHelpers.getModKeyPath("Skill Boost", "Athletics")).toBe("system.skills.Athletics.boost");
    expect(ModifierHelpers.getModKeyPath("Stat", "Soak")).toBe("system.stats.soak.value");
  });

  it("delegates skill modifier reverse lookups to the canonical modifier map", () => {
    expect(ModifierHelpers.getModTypeByModPath("system.skills.Athletics.boost")).toBe("Skill Boost");
  });
});
