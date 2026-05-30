import { describe, it, expect } from "vitest";
import { ShipWeaponData } from "../../../modules/data/item/shipweapon-data.js";

describe("ShipWeaponData schema", () => {
  const schema = ShipWeaponData.defineSchema();

  it("composes shared weapon fragments plus ship weapon-specific fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "adjusteditemmodifer",
      "crit",
      "damage",
      "description",
      "encumbrance",
      "equippable",
      "firingarc",
      "hardpoints",
      "itemattachment",
      "itemmodifier",
      "label",
      "metadata",
      "price",
      "quantity",
      "range",
      "rarity",
      "skill",
      "special",
    ]);
  });

  it("defaults numeric adjusted stats and range correctly", () => {
    expect(schema.damage.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.crit.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.hardpoints.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.range.getInitial()).toEqual({ value: "Short", adjusted: "Short", label: "Range" });
  });

  it("defaults firing arcs, skill, and label", () => {
    expect(schema.firingarc.getInitial()).toEqual({
      fore: false,
      aft: false,
      port: false,
      starboard: false,
      dorsal: false,
      ventral: false,
    });
    expect(schema.skill.getInitial()).toEqual({ value: "Gunnery" });
    expect(schema.label.getInitial()).toBe("Ship Weapon");
  });

  it("includes equippable and Phase 7-coupled attachment arrays", () => {
    expect(schema.equippable.getInitial()).toEqual({ value: true, equipped: false });
    expect(schema.itemattachment.getInitial()).toEqual([]);
    expect(schema.itemmodifier.getInitial()).toEqual([]);
    expect(schema.adjusteditemmodifer.getInitial()).toEqual([]);
  });
});
