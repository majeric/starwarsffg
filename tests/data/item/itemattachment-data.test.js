import { describe, it, expect } from "vitest";
import { ItemAttachmentData } from "../../../modules/data/item/itemattachment-data.js";

describe("ItemAttachmentData schema", () => {
  const schema = ItemAttachmentData.defineSchema();

  it("composes core, basic, hardpoint, quality, and attachment fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "adjusteditemmodifer",
      "attributes",
      "description",
      "encumbrance",
      "hardpoints",
      "itemattachment",
      "itemmodifier",
      "metadata",
      "price",
      "quantity",
      "rarity",
      "type",
    ]);
  });

  it("defaults attachment type and hardpoints", () => {
    expect(schema.type.getInitial()).toBe("all");
    expect(schema.hardpoints.getInitial()).toEqual({ value: 0, adjusted: 0 });
  });

  it("keeps nested attachment and modifier arrays free-form", () => {
    expect(schema.itemattachment.getInitial()).toEqual([]);
    expect(schema.itemmodifier.getInitial()).toEqual([]);
    expect(schema.adjusteditemmodifer.getInitial()).toEqual([]);
  });
});
