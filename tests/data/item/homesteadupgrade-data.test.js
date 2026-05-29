import { describe, it, expect } from "vitest";
import { HomesteadUpgradeData } from "../../../modules/data/item/homesteadupgrade-data.js";

describe("HomesteadUpgradeData schema", () => {
  const schema = HomesteadUpgradeData.defineSchema();

  it("is a metadata-only item schema", () => {
    expect(Object.keys(schema)).toEqual(["metadata"]);
  });

  it("starts metadata with empty tag and source lists", () => {
    expect(schema.metadata.getInitial()).toEqual({ tags: [], sources: [] });
  });
});
