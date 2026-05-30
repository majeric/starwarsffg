import { describe, it, expect, beforeEach } from "vitest";
import {
  isUserAttributeKey,
  attributeToChanges,
  attributesToEffectData,
} from "../../modules/active-effects/attribute-to-ae.js";

beforeEach(() => {
  // Foundry's CONST.ACTIVE_EFFECT_MODES.ADD === 2; the Phase 0 mock leaves CONST empty.
  globalThis.CONST = { ACTIVE_EFFECT_MODES: { ADD: 2 } };
});

describe("isUserAttributeKey", () => {
  it("treats attr-prefixed keys as user modifiers and others as inherent", () => {
    expect(isUserAttributeKey("attr12345")).toBe(true);
    expect(isUserAttributeKey("Wounds")).toBe(false);
    expect(isUserAttributeKey("")).toBe(false);
  });
});

describe("attributeToChanges", () => {
  it("maps a simple stat modifier to one ADD change", () => {
    expect(attributeToChanges({ modtype: "Stat", mod: "Soak", value: 1 })).toEqual([
      { key: "system.stats.soak.value", mode: 2, value: 1 },
    ]);
  });

  it("expands a Brawn characteristic mod into its implied changes", () => {
    expect(attributeToChanges({ modtype: "Characteristic", mod: "Brawn", value: 1 })).toEqual([
      { key: "system.characteristics.Brawn.value", mode: 2, value: 1 },
      { key: "system.stats.encumbrance.max", mode: 2, value: 1 },
      { key: "system.stats.soak.value", mode: 2, value: 1 },
    ]);
  });

  it("maps a skill boost modifier", () => {
    expect(attributeToChanges({ modtype: "Skill Boost", mod: "Athletics", value: 2 })).toEqual([
      { key: "system.skills.Athletics.boost", mode: 2, value: 2 },
    ]);
  });
});

describe("attributesToEffectData", () => {
  it("builds one effect per user attribute, skipping inherent keys", () => {
    const result = attributesToEffectData({
      Brawn: { modtype: "Characteristic", mod: "Brawn", value: 1 },
      attr1: { modtype: "Stat", mod: "Soak", value: 1 },
      attr2: { modtype: "Skill Boost", mod: "Cool", value: 1 },
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "Migrated: Soak",
      changes: [{ key: "system.stats.soak.value", mode: 2, value: 1 }],
    });
    expect(result[1].name).toBe("Migrated: Cool");
  });

  it("skips user attributes that map to no key", () => {
    const result = attributesToEffectData({ attr9: { modtype: "Nonsense", mod: "Whatever", value: 1 } });
    expect(result).toEqual([]);
  });
});
