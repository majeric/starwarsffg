import { describe, it, expect } from "vitest";
import { ArmourData } from "../../../modules/data/item/armour-data.js";

describe("ArmourData schema", () => {
  const schema = ArmourData.defineSchema();

  it("composes shared equipment fragments plus armour-specific fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "adjusteditemmodifer",
      "attributes",
      "defence",
      "description",
      "encumbrance",
      "equippable",
      "hardpoints",
      "itemattachment",
      "itemmodifier",
      "metadata",
      "price",
      "quantity",
      "rarity",
      "soak",
    ]);
  });

  it("defaults armour and hardpoint adjusted stats to zero", () => {
    expect(schema.defence.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.soak.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.hardpoints.getInitial()).toEqual({ value: 0, adjusted: 0 });
  });

  it("includes equippable and Phase 7-coupled attachment arrays", () => {
    expect(schema.equippable.getInitial()).toEqual({ value: true, equipped: false });
    expect(schema.itemattachment.getInitial()).toEqual([]);
    expect(schema.itemmodifier.getInitial()).toEqual([]);
    expect(schema.adjusteditemmodifer.getInitial()).toEqual([]);
  });
});
