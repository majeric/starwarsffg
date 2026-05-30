import { describe, it, expect } from "vitest";
import { StarWarsRules, GenesysRules, createRulesSystem } from "../../modules/rules/systems/rules-system.js";

describe("StarWarsRules", () => {
  const rules = new StarWarsRules();

  it("identifies as starwars", () => {
    expect(rules.id).toBe("starwars");
  });

  it("sorts talents alphabetically, not by tier", () => {
    expect(rules.sortTalentsByTier).toBe(false);
    expect(rules.compareTalents({ name: "Alpha" }, { name: "Beta" })).toBeLessThan(0);
    expect(rules.compareTalents({ name: "Beta" }, { name: "Alpha" })).toBeGreaterThan(0);
  });

  it("returns undefined for talent tier", () => {
    expect(rules.talentTier({ system: { tier: 3 } })).toBeUndefined();
  });
});

describe("GenesysRules", () => {
  const rules = new GenesysRules();

  it("identifies as genesys", () => {
    expect(rules.id).toBe("genesys");
  });

  it("sorts talents by tier", () => {
    expect(rules.sortTalentsByTier).toBe(true);
    expect(rules.compareTalents({ tier: 1 }, { tier: 3 })).toBeLessThan(0);
    expect(rules.compareTalents({ tier: 3 }, { tier: 1 })).toBeGreaterThan(0);
  });

  it("extracts talent tier from element", () => {
    expect(rules.talentTier({ system: { tier: "3" } })).toBe(3);
  });
});

describe("createRulesSystem", () => {
  it("returns StarWarsRules for starwars or undefined", () => {
    expect(createRulesSystem("starwars")).toBeInstanceOf(StarWarsRules);
    expect(createRulesSystem(undefined)).toBeInstanceOf(StarWarsRules);
    expect(createRulesSystem(null)).toBeInstanceOf(StarWarsRules);
  });

  it("returns GenesysRules for non-starwars themes", () => {
    expect(createRulesSystem("genesys")).toBeInstanceOf(GenesysRules);
  });
});
