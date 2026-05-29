import { describe, it, expect } from "vitest";
import { explodeMod, getModKeyPath, getModTypeByModPath } from "../../modules/active-effects/modifier-map.js";

describe("explodeMod", () => {
  it("expands Brawn to Brawn, EncumbranceMax, and Soak", () => {
    expect(explodeMod("Characteristic", "Brawn")).toEqual([
      { modType: "Characteristic", mod: "Brawn" },
      { modType: "Characteristic", mod: "EncumbranceMax" },
      { modType: "Stat", mod: "Soak" },
    ]);
  });

  it("expands a bare Defence into melee and ranged", () => {
    expect(explodeMod("Stat", "defence")).toEqual([
      { modType: "Stat", mod: "Defence.Melee" },
      { modType: "Stat", mod: "Defence.Ranged" },
    ]);
  });

  it("expands Shields to four facings, preserving modType", () => {
    expect(explodeMod("Vehicle Stat", "Shields")).toEqual([
      { modType: "Vehicle Stat", mod: "Shields.Fore" },
      { modType: "Vehicle Stat", mod: "Shields.Aft" },
      { modType: "Vehicle Stat", mod: "Shields.Port" },
      { modType: "Vehicle Stat", mod: "Shields.Starboard" },
    ]);
  });

  it("maps the directional defence variants", () => {
    expect(explodeMod("Stat", "defense-melee")).toEqual([{ modType: "Stat", mod: "Defence.Melee" }]);
    expect(explodeMod("Stat", "defence-ranged")).toEqual([{ modType: "Stat", mod: "Defence.Ranged" }]);
  });

  it("passes an unrecognised mod through unchanged", () => {
    expect(explodeMod("Skill Boost", "Athletics")).toEqual([{ modType: "Skill Boost", mod: "Athletics" }]);
  });
});

describe("getModKeyPath", () => {
  it("maps characteristics", () => {
    expect(getModKeyPath("Characteristic", "Brawn")).toBe("system.characteristics.Brawn.value");
  });

  it("maps stat totals including forcePool and defence facings", () => {
    expect(getModKeyPath("Stat", "ForcePool")).toBe("system.stats.forcePool.max");
    expect(getModKeyPath("Stat", "Defence.Melee")).toBe("system.stats.defence.melee");
    expect(getModKeyPath("Stat", "Soak")).toBe("system.stats.soak.value");
  });

  it("routes threshold-like mods to .max even when typed as Stat", () => {
    expect(getModKeyPath("Stat", "Wounds")).toBe("system.stats.wounds.max");
    expect(getModKeyPath("Characteristic", "EncumbranceMax")).toBe("system.stats.encumbrance.max");
    expect(getModKeyPath("Stat", "Systemstrain")).toBe("system.stats.systemStrain.max");
  });

  it("maps skill dice-symbol, rank, force and career-skill keys", () => {
    expect(getModKeyPath("Skill Boost", "Athletics")).toBe("system.skills.Athletics.boost");
    expect(getModKeyPath("Force Boost", "Discipline")).toBe("system.skills.Discipline.force");
    expect(getModKeyPath("Career Skill", "Cool")).toBe("system.skills.Cool.careerskill");
    expect(getModKeyPath("Skill Rank", "Vigilance")).toBe("system.skills.Vigilance.rank");
  });

  it("maps vehicle shields and hardpoints", () => {
    expect(getModKeyPath("Vehicle Stat", "Shields.Fore")).toBe("system.stats.shields.fore");
    expect(getModKeyPath("Vehicle Stat", "Vehicle.Hardpoints")).toBe("system.stats.customizationHardPoints.value");
  });

  it("maps armour soak and item encumbrance", () => {
    expect(getModKeyPath("Armor Stat", "soak")).toBe("system.stats.soak.value");
    expect(getModKeyPath("Weapon Stat", "encumbrance")).toBe("system.stats.encumbrance.value");
  });

  it("returns undefined for an unknown mod type", () => {
    expect(getModKeyPath("Nonsense", "Whatever")).toBeUndefined();
  });
});

describe("getModTypeByModPath", () => {
  it("infers the mod type from a skill path suffix", () => {
    expect(getModTypeByModPath("system.skills.Athletics.boost")).toBe("Skill Boost");
    expect(getModTypeByModPath("system.skills.Discipline.force")).toBe("Force Boost");
    expect(getModTypeByModPath("system.skills.Cool.careerskill")).toBe("Career Skill");
  });

  it("returns undefined for a non-skill path", () => {
    expect(getModTypeByModPath("system.stats.soak.value")).toBeUndefined();
  });
});
