import { describe, it, expect } from "vitest";
import { NemesisData } from "../../../modules/data/actor/nemesis-data.js";

describe("NemesisData schema", () => {
  const schema = NemesisData.defineSchema();

  it("composes the full humanoid templates with no per-type fields", () => {
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

  it("uses the full stats template, including strain", () => {
    expect(schema.stats.getInitial()).toHaveProperty("strain");
  });

  it("declares the full characteristic and skill sets", () => {
    expect(Object.keys(schema.characteristics.getInitial())).toHaveLength(6);
    expect(Object.keys(schema.skills.getInitial())).toHaveLength(35);
  });
});
