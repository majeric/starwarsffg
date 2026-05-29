import { describe, it, expect } from "vitest";
import { SpeciesData } from "../../../modules/data/item/species-data.js";

describe("SpeciesData schema", () => {
  const schema = SpeciesData.defineSchema();

  it("composes core item fields plus species-specific maps and starting XP", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "abilities",
      "attributes",
      "description",
      "metadata",
      "species",
      "startingXP",
      "talents",
    ]);
  });

  it("keeps talents, abilities, and species as free-form maps", () => {
    expect(schema.talents.getInitial()).toEqual({});
    expect(schema.abilities.getInitial()).toEqual({});
    expect(schema.species.getInitial()).toEqual({});
  });

  it("defaults starting XP to zero", () => {
    expect(schema.startingXP.getInitial()).toBe(0);
  });
});
