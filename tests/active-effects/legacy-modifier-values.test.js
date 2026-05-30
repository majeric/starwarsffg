import { describe, expect, it } from "vitest";
import {
  getCalculatedValueFromCurrentAndArray,
  getDicePoolModifiers,
  shouldApplyCharacteristicToDamage,
} from "../../modules/active-effects/legacy-modifier-values.js";

function itemWithAttributes(attributes, extraSystem = {}) {
  return {
    system: {
      attributes,
      ...extraSystem,
    },
  };
}

describe("getCalculatedValueFromCurrentAndArray", () => {
  it("multiplies matching attribute values by item rank", () => {
    const item = itemWithAttributes(
      {
        attr1: { modtype: "Weapon Stat", mod: "damage", value: 2 },
        attr2: { modtype: "Weapon Stat", mod: "critical", value: 1 },
      },
      { rank: 3 }
    );

    expect(getCalculatedValueFromCurrentAndArray(item, [], "damage", "Weapon Stat")).toBe(6);
  });

  it("returns zero when the item has no matching legacy attributes", () => {
    const item = itemWithAttributes({});

    expect(getCalculatedValueFromCurrentAndArray(item, [], "soak", "Armor Stat")).toBe(0);
  });
});

describe("getDicePoolModifiers", () => {
  it("applies legacy dice-pool attributes to the pool", async () => {
    const item = itemWithAttributes({
      attr1: { modtype: "Roll Modifiers", mod: "Add Boost", value: 2 },
      attr2: { modtype: "Result Modifiers", mod: "Add Success", value: 1 },
      attr3: { modtype: "Dice Modifiers", mod: "Upgrade Ability", value: 1 },
    });

    const pool = await getDicePoolModifiers({ ability: 1 }, item, []);

    expect(pool.boost).toBe(2);
    expect(pool.success).toBe(1);
    expect(pool.ability).toBe(0);
    expect(pool.proficiency).toBe(1);
  });
});

describe("shouldApplyCharacteristicToDamage", () => {
  it("requires a selected characteristic", () => {
    expect(shouldApplyCharacteristicToDamage({ characteristic: { value: "Brawn" } })).toBe(true);
    expect(shouldApplyCharacteristicToDamage({ characteristic: { value: "" } })).toBe(false);
  });
});
