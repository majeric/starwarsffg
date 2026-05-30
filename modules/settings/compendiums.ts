// @ts-nocheck -- FIXME(types): strict null checks for Foundry runtime globals; type during dedicated strict pass
/**
 * Register compendium-pack source settings used by the character creator
 * and importers. Extracted from swffg-main.js by Phase 2.2.
 *
 * All settings are world-scoped, hidden from the in-game settings UI
 * (config: false), and edited via the system's own compendium-source
 * configuration screen. Adding a new compendium-source setting is one
 * line in COMPENDIUM_SETTINGS — the localization keys follow the
 * convention SWFFG.Settings.Purchase.<Capitalized>.Name / .Hint where
 * <Capitalized> is the setting key with the "Compendiums" suffix stripped.
 */
const COMPENDIUM_SETTINGS = [
  { key: "specializationCompendiums", label: "Specialization", default: "world.oggdudespecializations" },
  { key: "signatureAbilityCompendiums", label: "SignatureAbility", default: "world.oggdudesignatureabilities" },
  { key: "forcePowerCompendiums", label: "ForcePower", default: "world.oggdudeforcepowers" },
  { key: "talentCompendiums", label: "Talent", default: "" },
  { key: "backgroundCompendiums", label: "Background", default: "world.oggdudebackgrounds" },
  { key: "obligationCompendiums", label: "Obligation", default: "world.oggdudeobligations" },
  { key: "speciesCompendiums", label: "Species", default: "world.oggdudespecies" },
  { key: "careerCompendiums", label: "Career", default: "world.oggdudecareers" },
  { key: "motivationCompendiums", label: "Motivation", default: "world.oggdudemotivations" },
  {
    key: "itemCompendiums",
    label: "Item",
    default:
      "world.oggdudeweapons,world.oggdudearmor,world.oggdudegear,world.oggdudearmorattachments,world.oggdudegenericattachments,world.oggdudeweaponattachments,world.oggdudearmormods,world.oggdudegenericmods,world.oggdudeweaponmods",
  },
];

export function registerCompendiumSettings(): void {
  for (const entry of COMPENDIUM_SETTINGS) {
    game.settings.register("starwarsffg", entry.key, {
      name: game.i18n.localize(`SWFFG.Settings.Purchase.${entry.label}.Name`),
      hint: game.i18n.localize(`SWFFG.Settings.Purchase.${entry.label}.Hint`),
      scope: "world",
      config: false,
      default: entry.default,
      type: String,
    });
  }
}
