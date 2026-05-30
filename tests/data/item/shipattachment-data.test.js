import { describe, it, expect } from "vitest";
import { ShipAttachmentData } from "../../../modules/data/item/shipattachment-data.js";

describe("ShipAttachmentData schema", () => {
  const schema = ShipAttachmentData.defineSchema();

  it("composes the six shared equipment fragment groups plus label", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "adjusteditemmodifer",
      "description",
      "encumbrance",
      "equippable",
      "hardpoints",
      "itemattachment",
      "itemmodifier",
      "label",
      "metadata",
      "price",
      "quantity",
      "rarity",
    ]);
  });

  it("defaults label, hardpoints, and equippable state", () => {
    expect(schema.label.getInitial()).toBe("Ship Attachment");
    expect(schema.hardpoints.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.equippable.getInitial()).toEqual({ value: true, equipped: false });
  });

  it("keeps modifier and attachment arrays free-form", () => {
    expect(schema.itemattachment.getInitial()).toEqual([]);
    expect(schema.itemmodifier.getInitial()).toEqual([]);
    expect(schema.adjusteditemmodifer.getInitial()).toEqual([]);
  });
});
