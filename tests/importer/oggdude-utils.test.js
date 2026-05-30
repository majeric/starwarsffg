import { describe, it, expect } from "vitest";
import {
  convertOGCharacteristic,
  getAttributeObject,
  getSources,
  getSourcesAsArray,
  prepareBaseObject,
} from "../../modules/importer/oggdude/oggdude-utils.js";

describe("convertOGCharacteristic", () => {
  it("maps OggDude abbreviations to full names", () => {
    expect(convertOGCharacteristic("BR")).toBe("Brawn");
    expect(convertOGCharacteristic("AG")).toBe("Agility");
    expect(convertOGCharacteristic("INT")).toBe("Intellect");
    expect(convertOGCharacteristic("CUN")).toBe("Cunning");
    expect(convertOGCharacteristic("WIL")).toBe("Willpower");
    expect(convertOGCharacteristic("PR")).toBe("Presence");
  });

  it("returns undefined for unknown keys", () => {
    expect(convertOGCharacteristic("XX")).toBeUndefined();
  });
});

describe("getAttributeObject", () => {
  it("maps stat fields to modifier-shaped attributes", () => {
    const result = getAttributeObject({ SoakValue: 2, WoundThreshold: 12 });
    expect(result.Soak).toEqual({ mod: "Soak", modtype: "Stat", value: 2 });
    expect(result.Wounds).toEqual({ mod: "Wounds", modtype: "Stat", value: 12 });
  });

  it("skips fields not present in input", () => {
    const result = getAttributeObject({ SoakValue: 1 });
    expect(result.ForcePool).toBeUndefined();
  });
});

describe("getSources", () => {
  it("returns empty string for no sources", () => {
    expect(getSources(null)).toBe("");
    expect(getSources(undefined)).toBe("");
  });

  it("formats a single source with page number", () => {
    const result = getSources({ Source: { _: "Core Rulebook", $Page: "42" } });
    expect(result).toContain("Page 42");
    expect(result).toContain("Core Rulebook");
  });
});

describe("getSourcesAsArray", () => {
  it("returns empty array for no sources", () => {
    expect(getSourcesAsArray(null)).toEqual([]);
  });

  it("parses a source with page number", () => {
    const result = getSourcesAsArray({ Source: { _: "Core", $Page: "10" } });
    expect(result).toEqual(["Core pg.10"]);
  });
});

describe("prepareBaseObject", () => {
  it("creates a base import object with name, type, and import id flag", () => {
    const result = prepareBaseObject({ Name: "Blaster Pistol", Key: "BLASPIST" }, "weapon");
    expect(result.name).toBe("Blaster Pistol");
    expect(result.type).toBe("weapon");
    expect(result.flags.starwarsffg.ffgimportid).toBe("BLASPIST");
    expect(result.data).toEqual({});
  });
});
