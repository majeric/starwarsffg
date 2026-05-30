import CrewSettings from "./crew-settings.js";

/**
 * Register the world-level crew-role settings. Extracted from
 * `swffg-main.js`'s `registerCrewRoles()` async function by Phase 2.7.
 *
 * Named `crew-main-settings.js` to avoid clashing with the existing
 * `crew-settings.js` (which is the application class used by the menu's
 * `type` field). A follow-up task can consolidate the two once the wider
 * settings refactor lets us rename freely.
 *
 * The function runs async because the original was async, even though the
 * body does no awaits. Preserving the signature avoids surprising callers.
 */
export async function registerCrewMainSettings(): Promise<void> {
  const defaultArrayCrewRoles = [
    {
      role_name: game.i18n.localize("SWFFG.Crew.Roles.Gunner.Name"),
      role_skill: game.i18n.localize("SWFFG.SkillsNameGunnery"),
      use_weapons: true,
      use_handling: false,
    },
  ];

  game.settings.registerMenu("starwarsffg", "arrayCrewRoles", {
    name: game.i18n.localize("SWFFG.Crew.Settings.Name"),
    label: game.i18n.localize("SWFFG.Crew.Settings.Label"),
    hint: game.i18n.localize("SWFFG.Crew.Settings.Hint"),
    icon: "fas fa-file-import",
    type: CrewSettings,
    restricted: true,
  });

  game.settings.register("starwarsffg", "arrayCrewRoles", {
    // FIXME(types): Foundry accepts this legacy metadata, but fvtt-types
    // omits it from ClientSettings registration data.
    module: "starwarsffg",
    name: "arrayCrewRoles",
    scope: "world",
    default: defaultArrayCrewRoles,
    config: false,
    type: Object,
  } as any);

  const initiativeCrewRole = {
    role_name: game.i18n.localize("SWFFG.Crew.Roles.Initiative.Name"),
    role_skill: undefined,
    use_weapons: false,
    use_handling: false,
  };

  game.settings.register("starwarsffg", "initiativeCrewRole", {
    // FIXME(types): Foundry accepts this legacy metadata, but fvtt-types
    // omits it from ClientSettings registration data.
    module: "starwarsffg",
    name: "initiativeCrewRole",
    scope: "world",
    default: initiativeCrewRole,
    config: false,
    type: Object,
  } as any);
}
