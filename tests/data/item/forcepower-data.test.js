import { describe, it, expect } from "vitest";
import { ForcePowerData } from "../../../modules/data/item/forcepower-data.js";

function numberedUpgradeDefaults(count) {
  const upgrades = {};
  for (let index = 0; index < count; index += 1) {
    upgrades[`upgrade${index}`] = {};
  }
  return upgrades;
}

describe("ForcePowerData schema", () => {
  const schema = ForcePowerData.defineSchema();

  it("composes core item fields plus force power fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "attributes",
      "base_cost",
      "description",
      "metadata",
      "required_force_rating",
      "upgrades",
    ]);
  });

  it("defaults the sixteen upgrade-grid slots to free-form objects", () => {
    expect(schema.upgrades.getInitial()).toEqual(numberedUpgradeDefaults(16));
  });

  it("defaults base cost and required force rating to zero", () => {
    expect(schema.base_cost.getInitial()).toBe(0);
    expect(schema.required_force_rating.getInitial()).toBe(0);
  });
});
