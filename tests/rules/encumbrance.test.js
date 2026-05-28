import { describe, it, expect } from "vitest";
import { computeEncumbrance } from "../../modules/rules/calculators/encumbrance.js";

describe("computeEncumbrance", () => {
  it("returns 0 for an empty array", () => {
    expect(computeEncumbrance([])).toBe(0);
  });

  it("returns 0 for an item with no encumbrance fields", () => {
    expect(computeEncumbrance([{ type: "gear", system: {} }])).toBe(0);
  });

  it("subtracts 3 from equipped armour's adjusted encumbrance", () => {
    const item = {
      type: "armour",
      system: { encumbrance: { adjusted: 5 }, equippable: { equipped: true } },
    };
    expect(computeEncumbrance([item])).toBe(2);
  });

  it("floors equipped armour contribution at 0 when adjusted is below 3", () => {
    const item = {
      type: "armour",
      system: { encumbrance: { adjusted: 2 }, equippable: { equipped: true } },
    };
    expect(computeEncumbrance([item])).toBe(0);
  });

  it("multiplies an unequipped weapon's adjusted encumbrance by quantity", () => {
    const item = {
      type: "weapon",
      system: { encumbrance: { adjusted: 3 }, quantity: { value: 2 } },
    };
    expect(computeEncumbrance([item])).toBe(6);
  });

  it("uses encumbrance.value when adjusted is undefined for held-gear types", () => {
    const item = {
      type: "weapon",
      system: { encumbrance: { value: 4 }, quantity: { value: 2 } },
    };
    expect(computeEncumbrance([item])).toBe(8);
  });

  it("gear contributes value times quantity", () => {
    const item = {
      type: "gear",
      system: { encumbrance: { value: 2 }, quantity: { value: 3 } },
    };
    expect(computeEncumbrance([item])).toBe(6);
  });

  it("treats missing quantity as 0 (legacy quirk)", () => {
    const item = {
      type: "gear",
      system: { encumbrance: { value: 5 } },
    };
    expect(computeEncumbrance([item])).toBe(0);
  });

  it("sums contributions across mixed item types", () => {
    const items = [
      {
        type: "armour",
        system: { encumbrance: { adjusted: 5 }, equippable: { equipped: true } },
      },
      {
        type: "weapon",
        system: { encumbrance: { adjusted: 3 }, quantity: { value: 2 } },
      },
      {
        type: "gear",
        system: { encumbrance: { value: 2 }, quantity: { value: 3 } },
      },
    ];
    expect(computeEncumbrance(items)).toBe(14);
  });

  it("does not crash the total when an item access throws", () => {
    const exploding = new Proxy(
      {},
      {
        get() {
          throw new Error("boom");
        },
      },
    );
    const ok = {
      type: "gear",
      system: { encumbrance: { value: 2 }, quantity: { value: 3 } },
    };
    expect(computeEncumbrance([exploding, ok])).toBe(6);
  });
});
