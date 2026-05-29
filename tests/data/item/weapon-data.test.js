import { describe, it, expect } from "vitest";
import { WeaponData } from "../../../modules/data/item/weapon-data.js";

describe("WeaponData schema", () => {
  const schema = WeaponData.defineSchema();

  it("composes shared weapon fragments plus weapon-specific fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "adjusteditemmodifer",
      "ammo",
      "attributes",
      "characteristic",
      "crit",
      "damage",
      "description",
      "encumbrance",
      "equippable",
      "hardpoints",
      "itemattachment",
      "itemmodifier",
      "metadata",
      "price",
      "quantity",
      "range",
      "rarity",
      "skill",
      "special",
    ]);
  });

  it("defaults numeric adjusted stats and ammo to zero", () => {
    expect(schema.damage.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.crit.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.hardpoints.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.ammo.getInitial()).toEqual({ max: 0, value: 0 });
  });

  it("keeps range adjusted as a string and declares combat selectors", () => {
    expect(schema.range.getInitial()).toEqual({ value: "Short", adjusted: "Short", label: "Range" });
    expect(schema.skill.getInitial()).toEqual({ value: "Ranged: Light" });
    expect(schema.characteristic.getInitial()).toEqual({ value: "" });
    expect(schema.special.getInitial()).toEqual({ value: "" });
  });

  it("includes equippable and Phase 7-coupled attachment arrays", () => {
    expect(schema.equippable.getInitial()).toEqual({ value: true, equipped: false });
    expect(schema.itemattachment.getInitial()).toEqual([]);
    expect(schema.itemmodifier.getInitial()).toEqual([]);
    expect(schema.adjusteditemmodifer.getInitial()).toEqual([]);
  });
});
