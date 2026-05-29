/**
 * Pure mapping between the FFG modifier taxonomy and Active Effect change keys.
 *
 * Extracted verbatim from `modules/helpers/modifiers.js` (Phase 7, task 7.1) so
 * the mapping is independently testable and can be reused by the
 * attributes→ActiveEffect migration (7.4), the custom change modes (7.2), and
 * the modifier UI (7.5). `ModifierHelpers` now delegates to these functions.
 *
 * Behavior is identical to the legacy methods — do NOT change the mapping here
 * without an ADR; the characterization tests in tests/active-effects/ lock it.
 */

/**
 * Expand a mod into the list of mods it implies (e.g. Brawn also drives
 * Encumbrance threshold and Soak; Defence drives both melee and ranged).
 *
 * @param {string} modType
 * @param {string} mod
 * @returns {Array<{modType:string, mod:string}>}
 */
export function explodeMod(modType, mod) {
  const modLower = mod.toLocaleLowerCase();
  if (["defence-melee", "defense-melee"].includes(modLower)) {
    return [{ modType: "Stat", mod: "Defence.Melee" }];
  } else if (["defence-ranged", "defense-ranged"].includes(modLower)) {
    return [{ modType: "Stat", mod: "Defence.Ranged" }];
  } else if (["defence", "defense"].includes(modLower)) {
    return [
      { modType: "Stat", mod: "Defence.Melee" },
      { modType: "Stat", mod: "Defence.Ranged" },
    ];
  } else if (["Shields"].includes(mod)) {
    return [
      { modType: modType, mod: "Shields.Fore" },
      { modType: modType, mod: "Shields.Aft" },
      { modType: modType, mod: "Shields.Port" },
      { modType: modType, mod: "Shields.Starboard" },
    ];
  } else if (["Brawn"].includes(mod)) {
    return [
      { modType: modType, mod: "Brawn" },
      { modType: modType, mod: "EncumbranceMax" },
      { modType: "Stat", mod: "Soak" },
    ];
  } else if (["Willpower"].includes(mod)) {
    return [{ modType: modType, mod: "Willpower" }];
  } else {
    return [{ modType: modType, mod: mod }];
  }
}

/**
 * Map a modifier type + selection to the Active Effect change key (property
 * path) it modifies.
 *
 * @param {string} modType
 * @param {string} mod
 * @returns {string|undefined}
 */
/* eslint-disable-next-line complexity, max-lines-per-function -- verbatim taxonomy from modifiers.js; a table-driven refactor is a separate task */
export function getModKeyPath(modType, mod) {
  if (["Wounds", "Strain", "EncumbranceMax", "Speed", "Hulltrauma", "Systemstrain"].includes(mod)) {
    modType = "Threshold";
  }
  if (modType === "Characteristic") {
    return `system.characteristics.${mod}.value`;
  } else if (modType === "Stat All" || modType === "Stat") {
    if (mod === "ForcePool") {
      return `system.stats.forcePool.max`;
    } else if (mod === "Defence.Melee") {
      return `system.stats.defence.melee`;
    } else if (mod === "Defence.Ranged") {
      return `system.stats.defence.ranged`;
    } else {
      return `system.stats.${mod.toLocaleLowerCase()}.value`;
    }
  } else if (modType === "Threshold") {
    if (mod === "Hulltrauma") {
      return `system.stats.hullTrauma.max`;
    } else if (mod === "Systemstrain") {
      return `system.stats.systemStrain.max`;
    } else if (mod === "EncumbranceMax") {
      // the mod for this is different, so don't simply return the mod value
      return `system.stats.encumbrance.max`;
    } else {
      return `system.stats.${mod.toLocaleLowerCase()}.max`;
    }
  } else if (modType === "Force Boost") {
    return `system.skills.${mod}.force`;
  } else if (modType === "Skill Add Advantage") {
    return `system.skills.${mod}.advantage`;
  } else if (modType === "Skill Add Dark") {
    return `system.skills.${mod}.dark`;
  } else if (modType === "Skill Add Despair") {
    return `system.skills.${mod}.despair`;
  } else if (modType === "Skill Add Failure") {
    return `system.skills.${mod}.failure`;
  } else if (modType === "Skill Add Light") {
    return `system.skills.${mod}.light`;
  } else if (modType === "Skill Add Success") {
    return `system.skills.${mod}.success`;
  } else if (modType === "Skill Add Threat") {
    return `system.skills.${mod}.threat`;
  } else if (modType === "Skill Add Triumph") {
    return `system.skills.${mod}.triumph`;
  } else if (modType === "Skill Add Upgrade") {
    return `system.skills.${mod}.upgrades`;
  } else if (modType === "Skill Boost") {
    return `system.skills.${mod}.boost`;
  } else if (modType === "Skill Rank") {
    return `system.skills.${mod}.rank`;
  } else if (modType === "Skill Remove Setback") {
    return `system.skills.${mod}.remsetback`;
  } else if (modType === "Skill Setback") {
    return `system.skills.${mod}.setback`;
  } else if (modType === "Career Skill") {
    return `system.skills.${mod}.careerskill`;
  } else if (modType === "Vehicle Stat") {
    if (mod === "Shields.Fore") {
      return `system.stats.shields.fore`;
    } else if (mod === "Shields.Aft") {
      return `system.stats.shields.aft`;
    } else if (mod === "Shields.Port") {
      return `system.stats.shields.port`;
    } else if (mod === "Shields.Starboard") {
      return `system.stats.shields.starboard`;
    } else if (mod === "Vehicle.Hardpoints") {
      return `system.stats.customizationHardPoints.value`;
    } else {
      return `system.stats.${mod.toLocaleLowerCase()}.value`;
    }
  } else if (["Weapon Stat", "Armor Stat"].includes(modType) && mod === "encumbrance") {
    return `system.stats.encumbrance.value`;
  } else if (modType === "Armor Stat" && mod === "soak") {
    return `system.stats.soak.value`;
  } else {
    CONFIG?.logger?.debug?.(`Unknown mod type: ${modType}`);
    return undefined;
  }
}

/**
 * Reverse of `getModKeyPath` for the skill keyspace: infer the mod type from a
 * skill property path suffix.
 *
 * @param {string} skillPath
 * @returns {string|undefined}
 */
/* eslint-disable-next-line complexity -- verbatim taxonomy from modifiers.js; a lookup-map refactor is a separate task */
export function getModTypeByModPath(skillPath) {
  if (skillPath.endsWith("force")) {
    return "Force Boost";
  } else if (skillPath.endsWith("advantage")) {
    return "Skill Add Advantage";
  } else if (skillPath.endsWith("dark")) {
    return "Skill Add Dark";
  } else if (skillPath.endsWith("despair")) {
    return "Skill Add Despair";
  } else if (skillPath.endsWith("failure")) {
    return "Skill Add Failure";
  } else if (skillPath.endsWith("light")) {
    return "Skill Add Light";
  } else if (skillPath.endsWith("success")) {
    return "Skill Add Success";
  } else if (skillPath.endsWith("threat")) {
    return "Skill Add Threat";
  } else if (skillPath.endsWith("triumph")) {
    return "Skill Add Triumph";
  } else if (skillPath.endsWith("upgrades")) {
    return "Skill Add Upgrade";
  } else if (skillPath.endsWith("boost")) {
    return "Skill Boost";
  } else if (skillPath.endsWith("rank")) {
    return "Skill Rank";
  } else if (skillPath.endsWith("remsetback")) {
    return "Skill Remove Setback";
  } else if (skillPath.endsWith("setback")) {
    return "Skill Setback";
  } else if (skillPath.endsWith("careerskill")) {
    return "Career Skill";
  }
  return undefined;
}
