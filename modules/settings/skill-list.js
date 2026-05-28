import SkillListImporter from "../importer/skills-list-importer.js";
import SettingsHelpers from "./settings-helpers.js";
import { defaultSkillList } from "../config/ffg-skillslist.js";

/**
 * Register the always-present skill-list world settings. Extracted from
 * swffg-main.js's `gameSkillsList()` by Phase 2.5.
 *
 * The skilltheme setting depends on dynamic choices computed from the
 * loaded skill lists and is registered separately via
 * `registerSkillThemeSetting(choices)`.
 *
 * The arraySkillList setting is `type: Object` storing the skill-list
 * data directly. Legacy upstream worlds may have stored the same data
 * as a JSON-encoded string; the surviving `parseSkillList()` helper in
 * swffg-main.js handles that case defensively. Replacing parseSkillList
 * with a typed accessor is deferred.
 */
export function registerSkillListSettings() {
  game.settings.registerMenu("starwarsffg", "addskilltheme", {
    name: game.i18n.localize("SWFFG.SettingsSkillListImporter"),
    label: game.i18n.localize("SWFFG.SettingsSkillListImporterLabel"),
    hint: game.i18n.localize("SWFFG.SettingsSkillListImporterHint"),
    icon: "fas fa-file-import",
    type: SkillListImporter,
    restricted: true,
  });

  game.settings.register("starwarsffg", "addskilltheme", {
    name: "Item Importer",
    scope: "world",
    default: {},
    config: false,
    type: Object,
  });

  game.settings.register("starwarsffg", "arraySkillList", {
    name: "Skill List",
    scope: "world",
    default: defaultSkillList,
    config: false,
    type: Object,
    onChange: SettingsHelpers.debouncedReload,
  });
}

/**
 * Register the skilltheme setting once the available skill-list choices
 * are known. Choices are an `{ id: id }` map.
 *
 * @param {Object<string,string>} choices
 */
export function registerSkillThemeSetting(choices) {
  game.settings.register("starwarsffg", "skilltheme", {
    name: game.i18n.localize("SWFFG.SettingsSkillTheme"),
    hint: game.i18n.localize("SWFFG.SettingsSkillThemeHint"),
    scope: "world",
    config: false,
    default: "starwars",
    type: String,
    onChange: SettingsHelpers.debouncedReload,
    choices,
  });
}
