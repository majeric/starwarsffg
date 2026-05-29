import { describe, it, expect } from "vitest";
import { ObligationData } from "../../../modules/data/item/obligation-data.js";

describe("ObligationData schema", () => {
  const schema = ObligationData.defineSchema();

  it("composes core and basic item fields plus obligation fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "attributes",
      "description",
      "encumbrance",
      "magnitude",
      "metadata",
      "price",
      "quantity",
      "rarity",
      "subtype",
      "type",
    ]);
  });

  it("defaults obligation type, magnitude, and subtype", () => {
    expect(schema.type.getInitial()).toBe("duty");
    expect(schema.magnitude.getInitial()).toBe(0);
    expect(schema.subtype.getInitial()).toBe("");
  });

  it("includes basic item defaults with adjusted fields preserved", () => {
    expect(schema.quantity.getInitial()).toEqual({ value: 1 });
    expect(schema.encumbrance.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.price.getInitial()).toEqual({ value: 0, adjusted: 0 });
    expect(schema.rarity.getInitial()).toEqual({ value: 0, adjusted: 0 });
  });
});
