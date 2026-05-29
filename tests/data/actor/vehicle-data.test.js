import { describe, it, expect } from "vitest";
import { VehicleData } from "../../../modules/data/actor/vehicle-data.js";

describe("VehicleData schema", () => {
  const schema = VehicleData.defineSchema();

  it("composes biography/attributes/metadata plus stats and the top-level vehicle fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "attributes",
      "biography",
      "metadata",
      "silhouetteImage",
      "spaceShip",
      "stats",
    ]);
  });

  it("uses the vehicle-specific stats, not the humanoid stats", () => {
    const stats = schema.stats.getInitial();
    expect(stats).not.toHaveProperty("wounds");
    expect(stats.silhouette).toEqual({ value: 1 });
    expect(stats.hullTrauma).toEqual({ value: 0, min: 0, max: 10 });
    expect(stats.systemStrain.max).toBe(10);
    expect(stats.sensorRange).toEqual({ value: "Short" });
    expect(stats.consumables).toEqual({ value: 1, duration: "months" });
    expect(stats.crew).toEqual({});
  });

  it("defaults spaceShip false and the silhouette image path", () => {
    expect(schema.spaceShip.getInitial()).toBe(false);
    expect(schema.silhouetteImage.getInitial()).toBe("systems/starwarsffg/images/shipdefence.png");
  });
});
