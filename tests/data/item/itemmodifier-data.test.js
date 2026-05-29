import { describe, it, expect } from "vitest";
import { ItemModifierData } from "../../../modules/data/item/itemmodifier-data.js";

describe("ItemModifierData schema", () => {
  const schema = ItemModifierData.defineSchema();

  it("composes core fields plus quality arrays and modifier fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "adjusteditemmodifer",
      "attributes",
      "description",
      "itemmodifier",
      "metadata",
      "rank",
      "type",
    ]);
  });

  it("defaults modifier type and rank", () => {
    expect(schema.type.getInitial()).toBe("all");
    expect(schema.rank.getInitial()).toBe(0);
  });

  it("keeps quality arrays free-form", () => {
    expect(schema.itemmodifier.getInitial()).toEqual([]);
    expect(schema.adjusteditemmodifer.getInitial()).toEqual([]);
  });
});
