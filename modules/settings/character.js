/**
 * Register character-defaults and limits world settings. Extracted from
 * swffg-main.js by Phase 2.4.
 *
 * All settings are world-scoped and edited via the system's actor
 * configuration screen (`config: false`). Localization keys are explicit
 * per entry because the source uses several different prefixes.
 */
const CHARACTER_SETTINGS = [
  { key: "notifyOnXpSpend", locale: "SWFFG.Settings.Purchase.Notify", default: true, type: Boolean },
  { key: "defaultObligation", locale: "SWFFG.Settings.Obligation.Default", default: 20, type: Number },
  { key: "defaultDuty", locale: "SWFFG.Settings.Duty.Default", default: 20, type: Number },
  { key: "defaultMorality", locale: "SWFFG.Settings.Morality.Default", default: 50, type: Number },
  { key: "maxRarity", locale: "SWFFG.Settings.CharCreator.Items.maxRarity", default: 6, type: Number },
  { key: "allowRestricted", locale: "SWFFG.Settings.CharCreator.Items.allowRestricted", default: false, type: Boolean },
  { key: "defaultCredits", locale: "SWFFG.Settings.Credits.Default", default: 500, type: Number },
  { key: "maxAttribute", locale: "SWFFG.Settings.maxAttribute", default: 7, type: Number },
  { key: "maxSkill", locale: "SWFFG.Settings.maxSkill", default: 6, type: Number },
];

export function registerCharacterSettings() {
  for (const entry of CHARACTER_SETTINGS) {
    game.settings.register("starwarsffg", entry.key, {
      name: game.i18n.localize(`${entry.locale}.Name`),
      hint: game.i18n.localize(`${entry.locale}.Hint`),
      scope: "world",
      config: false,
      default: entry.default,
      type: entry.type,
    });
  }
}
