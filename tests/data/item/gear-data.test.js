import { describe, it, expect } from "vitest";
import { GearData } from "../../../modules/data/item/gear-data.js";

describe("GearData schema", () => {
  const schema = GearData.defineSchema();

  it("composes core, basic, item attachment, and quality fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "adjusteditemmodifer",
      "description",
      "encumbrance",
      "itemattachment",
      "itemmodifier",
      "metadata",
      "price",
      "quantity",
      "rarity",
    ]);
  });

  it("includes basic item defaults with restricted rarity preserved", () => {
    expect(schema.quantity.getInitial()).toEqual({ value: 1 });
    expect(schema.encumbrance.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.price.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.rarity.getInitial()).toEqual({ value: 0, adjusted: 0, isrestricted: false });
  });

  it("defaults legacy attachment and modifier arrays to empty lists", () => {
    expect(schema.itemattachment.getInitial()).toEqual([]);
    expect(schema.itemmodifier.getInitial()).toEqual([]);
    expect(schema.adjusteditemmodifer.getInitial()).toEqual([]);
  });
});
