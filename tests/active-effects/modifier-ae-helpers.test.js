import { describe, it, expect } from "vitest";
import {
  isModifierEffect,
  getModifierEffectsAsAttributes,
} from "../../modules/active-effects/modifier-ae-helpers.js";

describe("isModifierEffect", () => {
  it("rejects (inherent) effects", () => {
    expect(isModifierEffect({ name: "(inherent)" })).toBe(false);
  });

  it("accepts effects with ffgModType flag", () => {
    const effect = { name: "Stat: Soak", flags: { starwarsffg: { ffgModType: "Stat", ffgMod: "Soak" } } };
    expect(isModifierEffect(effect)).toBe(true);
  });

  it("accepts effects named with attr prefix (legacy)", () => {
    expect(isModifierEffect({ name: "attr1234567890" })).toBe(true);
  });

  it("accepts migrated effects", () => {
    expect(isModifierEffect({ name: "Migrated: Soak" })).toBe(true);
  });

  it("rejects unnamed effects without flags", () => {
    expect(isModifierEffect({ name: "Some other effect" })).toBe(false);
  });
});

describe("getModifierEffectsAsAttributes", () => {
  function makeFakeDoc(effects) {
    return {
      getEmbeddedCollection() {
        return {
          [Symbol.iterator]() { return effects[Symbol.iterator](); },
        };
      },
    };
  }

  it("returns empty for doc with no effects", () => {
    const doc = makeFakeDoc([]);
    expect(getModifierEffectsAsAttributes(doc)).toEqual({});
  });

  it("maps flagged effects to attribute-shaped entries", () => {
    const effects = [{
      id: "ef1",
      name: "Stat: Soak",
      flags: { starwarsffg: { ffgModType: "Stat", ffgMod: "Soak" } },
      changes: [{ key: "system.stats.soak.value", mode: 2, value: 1 }],
    }];
    const result = getModifierEffectsAsAttributes(makeFakeDoc(effects));
    expect(result).toHaveProperty("ef1");
    expect(result.ef1.modtype).toBe("Stat");
    expect(result.ef1.mod).toBe("Soak");
    expect(result.ef1.value).toBe(1);
  });

  it("maps legacy attr-named effects via reverse key lookup", () => {
    const effects = [{
      id: "ef2",
      name: "attr1234567890",
      flags: {},
      changes: [{ key: "system.characteristics.Brawn.value", mode: 2, value: 2 }],
    }];
    const result = getModifierEffectsAsAttributes(makeFakeDoc(effects));
    expect(result.ef2.modtype).toBe("Characteristic");
    expect(result.ef2.mod).toBe("Brawn");
    expect(result.ef2.value).toBe(2);
  });

  it("skips (inherent) effects", () => {
    const effects = [{
      id: "ef3",
      name: "(inherent)",
      flags: {},
      changes: [{ key: "system.characteristics.Brawn.value", mode: 2, value: 3 }],
    }];
    const result = getModifierEffectsAsAttributes(makeFakeDoc(effects));
    expect(result).toEqual({});
  });

  it("handles skill-based effects via reverse lookup", () => {
    const effects = [{
      id: "ef4",
      name: "Migrated: Perception",
      flags: {},
      changes: [{ key: "system.skills.Perception.boost", mode: 2, value: 1 }],
    }];
    const result = getModifierEffectsAsAttributes(makeFakeDoc(effects));
    expect(result.ef4.modtype).toBe("Skill Boost");
    expect(result.ef4.mod).toBe("Perception");
  });
});
