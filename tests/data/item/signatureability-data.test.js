import { describe, it, expect } from "vitest";
import { SignatureAbilityData } from "../../../modules/data/item/signatureability-data.js";

function numberedUpgradeDefaults(count) {
  const upgrades = {};
  for (let index = 0; index < count; index += 1) {
    upgrades[`upgrade${index}`] = {};
  }
  return upgrades;
}

describe("SignatureAbilityData schema", () => {
  const schema = SignatureAbilityData.defineSchema();

  it("composes core item fields plus signature ability fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "base_cost",
      "description",
      "metadata",
      "upgrades",
      "uplink_nodes",
    ]);
  });

  it("defaults the eight upgrade-grid slots to free-form objects", () => {
    expect(schema.upgrades.getInitial()).toEqual(numberedUpgradeDefaults(8));
  });

  it("defaults base cost and all uplink nodes", () => {
    expect(schema.base_cost.getInitial()).toBe(0);
    expect(schema.uplink_nodes.getInitial()).toEqual({
      uplink0: false,
      uplink1: false,
      uplink2: false,
      uplink3: false,
    });
  });
});
