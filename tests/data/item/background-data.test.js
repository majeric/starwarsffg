import { describe, it, expect } from "vitest";
import { BackgroundData } from "../../../modules/data/item/background-data.js";

describe("BackgroundData schema", () => {
  const schema = BackgroundData.defineSchema();

  it("composes core and basic item fields plus type", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "attributes",
      "description",
      "encumbrance",
      "metadata",
      "price",
      "quantity",
      "rarity",
      "type",
    ]);
  });

  it("defaults the background type to culture", () => {
    expect(schema.type.getInitial()).toBe("culture");
  });

  it("includes basic item defaults with adjusted fields preserved", () => {
    expect(schema.quantity.getInitial()).toEqual({ value: 1 });
    expect(schema.encumbrance.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.price.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.rarity.getInitial()).toEqual({ value: 0, adjusted: 0, isrestricted: false });
  });
});
