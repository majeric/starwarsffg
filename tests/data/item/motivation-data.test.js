import { describe, it, expect } from "vitest";
import { MotivationData } from "../../../modules/data/item/motivation-data.js";

describe("MotivationData schema", () => {
  const schema = MotivationData.defineSchema();

  it("composes core and basic item fields plus type", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "description",
      "encumbrance",
      "metadata",
      "price",
      "quantity",
      "rarity",
      "type",
    ]);
  });

  it("defaults the motivation type to ambition", () => {
    expect(schema.type.getInitial()).toBe("ambition");
  });

  it("includes basic item defaults with adjusted fields preserved", () => {
    expect(schema.quantity.getInitial()).toEqual({ value: 1 });
    expect(schema.encumbrance.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.price.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.rarity.getInitial()).toEqual({ value: 0, adjusted: 0, isrestricted: false });
  });
});
