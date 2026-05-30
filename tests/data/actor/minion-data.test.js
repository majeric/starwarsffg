import { describe, it, expect } from "vitest";
import { MinionData } from "../../../modules/data/actor/minion-data.js";

describe("MinionData schema", () => {
  const schema = MinionData.defineSchema();

  it("composes the minion templates plus quantity and unit_wounds", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "biography",
      "characteristics",
      "metadata",
      "quantity",
      "skills",
      "stats",
      "unit_wounds",
    ]);
  });

  it("uses the full stats template, including strain", () => {
    const stats = schema.stats.getInitial();
    expect(stats).toHaveProperty("strain");
    expect(stats.wounds).toEqual({ value: 0, min: 0, max: 0, adjusted: 0 });
  });

  it("declares all six characteristics with value, label and abrev", () => {
    const characteristics = schema.characteristics.getInitial();
    expect(Object.keys(characteristics)).toHaveLength(6);
    expect(characteristics.Brawn).toEqual({ value: 0, label: "Brawn", abrev: "Br" });
  });

  it("declares the 35 core skills with characteristic and category", () => {
    const skills = schema.skills.getInitial();
    expect(Object.keys(skills)).toHaveLength(35);
    expect(skills.Brawl).toEqual({
      rank: 0,
      characteristic: "Brawn",
      groupskill: false,
      careerskill: false,
      type: "Combat",
      max: 6,
    });
    expect(skills["Knowledge: Xenology"].type).toBe("Knowledge");
  });

  it("defaults quantity to a single living minion and zero unit wounds", () => {
    expect(schema.quantity.getInitial()).toEqual({ value: 1, max: 1 });
    expect(schema.unit_wounds.getInitial()).toEqual({ value: 0 });
  });
});
