import { describe, it, expect } from "vitest";
import { RivalData } from "../../../modules/data/actor/rival-data.js";

describe("RivalData schema", () => {
  const schema = RivalData.defineSchema();

  it("composes the rival templates (species and general, no career/specialisation)", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "biography",
      "characteristics",
      "general",
      "metadata",
      "skills",
      "species",
      "stats",
    ]);
  });

  it("inlines a stats block WITHOUT strain", () => {
    const stats = schema.stats.getInitial();
    expect(stats).not.toHaveProperty("strain");
    expect(stats).toHaveProperty("wounds");
    expect(stats).toHaveProperty("forcePool");
  });

  it("defaults species and general to empty", () => {
    expect(schema.species.getInitial()).toEqual({ value: "" });
    expect(schema.general.getInitial()).toEqual({ features: "" });
  });
});
