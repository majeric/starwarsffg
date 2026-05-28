/**
 * A systems implementation of the Star Wars RPG by Fantasy Flight Games.
 * Author: Esrin
 * Software License: GNU GPLv3
 */

// Import Modules
import { FFG } from "./swffg-config.js";
import { ActorFFG } from "./actors/actor-ffg.js";
import { TokenFFG } from "./tokens/token-ffg.js";
import CombatantFFG, {
  CombatFFG,
  CombatTrackerFFG,
  registerHandleCombatantRemoval,
  updateCombatTracker
} from "./combat-ffg.js";
import { ActiveEffectFFG} from "./active-effects/active-effect-ffg.js";
import { ItemFFG } from "./items/item-ffg.js";
import { ItemSheetFFG } from "./items/item-sheet-ffg.js";
import { ItemSheetFFGV2 } from "./items/item-sheet-ffg-v2.js";
import { ActorSheetFFG } from "./actors/actor-sheet-ffg.js";
import { ActorSheetFFGV2 } from "./actors/actor-sheet-ffg-v2.js";
import { AdversarySheetFFG } from "./actors/adversary-sheet-ffg.js";
import { AdversarySheetFFGV2 } from "./actors/adversary-sheet-ffg-v2.js";
import { DicePoolFFG, RollFFG } from "./dice-pool-ffg.js";
import { GroupManager } from "./groupmanager-ffg.js";
import PopoutEditor from "./popout-editor.js";

import DiceHelpers from "./helpers/dice-helpers.js";
import Helpers from "./helpers/common.js";
import TemplateHelpers from "./helpers/partial-templates.js";
import SkillListImporter from "./importer/skills-list-importer.js";
import DestinyTracker from "./ffg-destiny-tracker.js";
import { defaultSkillList } from "./config/ffg-skillslist.js";
import { skillModifierTypes } from "./config/ffg-modifiers.js";
import SettingsHelpers from "./settings/settings-helpers.js";
import {register_crew} from "./helpers/crew.js";

// Import Dice Types
import { AbilityDie, BoostDie, ChallengeDie, DifficultyDie, ForceDie, ProficiencyDie, SetbackDie } from "./dice-pool-ffg.js";
import { createFFGMacro, updateMacro } from "./helpers/macros.js";
import EmbeddedItemHelpers from "./helpers/embeddeditem-helpers.js";
import DataImporter from "./importer/data-importer.js";
import PauseFFG from "./apps/pause-ffg.js";
import FlagMigrationHelpers from "./helpers/flag-migration-helpers.js";
import RollBuilderFFG from "./dice/roll-builder.js";
import CrewSettings from "./settings/crew-settings.js";
import {register_dice_enricher, register_oggdude_tag_enricher, register_roll_tag_enricher} from "./helpers/journal.js";
import {drawAdversaryCount, drawMinionCount, registerTokenControls} from "./helpers/token.js";
import { handleUpdate } from "./migrations/index.js";
import SWAImporter from "./importer/swa-importer.js";
import {CharacterCreator} from "./helpers/character-creator.js";
import {xpLogUndo} from "./helpers/actor-helpers.js";
import {register_system_tours} from "./helpers/tours.js";
import { registerAllSettings } from "./settings/index.js";
import { registerSkillThemeSetting } from "./settings/skill-list.js";
import { registerCrewMainSettings } from "./settings/crew-main-settings.js";
import { registerAllHooks } from "./hooks/index.js";
import { registerRollFFG } from "./dice/roll-registration.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

async function parseSkillList() {
  try {
    return JSON.parse(await game.settings.get("starwarsffg", "arraySkillList"));
  } catch (e) {
    CONFIG.logger.log("Could not parse custom skill list, returning raw setting");
    return await game.settings.get("starwarsffg", "arraySkillList");
  }
}

// Register hooks extracted by Phase 3 of the restructure (see
// docs/restructure/phases/phase-03-hooks.md). Hooks still registered
// inline below have not been extracted yet.
registerAllHooks();

// Setup hook now lives in modules/hooks/setup.js (Phase 3.2).
// Registered via registerAllHooks() above.

Hooks.once("init", async function () {
  console.log(`Initializing SWFFG System`);
  // Place our classes in their own namespace for later reference.
  game.ffg = {
    ActorFFG,
    TokenFFG,
    ItemFFG,
    CombatFFG,
    CombatantFFG,
    CombatTrackerFFG,
    RollFFG,
    DiceHelpers,
    RollBuilderFFG,
    addons: {
      PopoutEditor,
    },
    diceterms: [AbilityDie, BoostDie, ChallengeDie, DifficultyDie, ForceDie, ProficiencyDie, SetbackDie],
    ActiveEffectFFG,
  };

  // Define custom log prefix and logger
  CONFIG.module = "Starwars FFG";
  CONFIG.logger = Helpers.logger;

  // Define custom Entity classes. This will override the default Actor
  // to instead use our extended version.
  CONFIG.Actor.documentClass = ActorFFG;
  CONFIG.Item.documentClass = ItemFFG;
  CONFIG.ActiveEffect.documentClass = ActiveEffectFFG;

  // we do not want the legacy active effect transfer mode
  // also, reeeeeeeeeeeeeeeee
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Define custom Roll class (Phase 4.3 — see modules/dice/roll-registration.js
  // and ADR-009 for the V13 API investigation that chose unshift).
  registerRollFFG();

  // Define DiceTerms
  CONFIG.Dice.terms["a"] = AbilityDie;
  CONFIG.Dice.terms["b"] = BoostDie;
  CONFIG.Dice.terms["c"] = ChallengeDie;
  CONFIG.Dice.terms["i"] = DifficultyDie;
  CONFIG.Dice.terms["f"] = ForceDie;
  CONFIG.Dice.terms["p"] = ProficiencyDie;
  CONFIG.Dice.terms["s"] = SetbackDie;

  // Give global access to FFG config.
  CONFIG.FFG = FFG;

  // TURN ON OR OFF HOOK DEBUGGING
  CONFIG.debug.hooks = false;

  CONFIG.ui.pause = PauseFFG;

  // Register settings extracted by Phase 2 of the restructure (see
  // docs/restructure/phases/phase-02-settings.md). Settings still
  // registered inline below have not been extracted yet.
  registerAllSettings();

  // enableDebug setting now lives in modules/settings/debug.js (Phase 2.8).
  // Registered via registerAllSettings() above.

  // additionalStatuses setting now lives in modules/settings/simulation.js
  // (Phase 2.5). Registered via registerAllSettings() above.

  // configuredTurnMarker setting now lives in modules/settings/combat.js
  // (Phase 2.3). Registered via registerAllSettings() above.

  // Token _drawBar override now lives as a method on TokenFFG in
  // modules/tokens/token-ffg.js (Phase 4.2). TokenFFG is registered
  // unconditionally below via CONFIG.Token.objectClass so the FFG bar
  // drawing applies whether or not generic slots are enabled.
  CONFIG.Token.objectClass = TokenFFG;

  // Load character templates so that dynamic skills lists work correctly
  await foundry.applications.handlebars.loadTemplates(["systems/starwarsffg/templates/actors/ffg-character-sheet.html", "systems/starwarsffg/templates/actors/ffg-minion-sheet.html"]);

  SettingsHelpers.initLevelSettings();

  const uitheme = game.settings.get("starwarsffg", "ui-uitheme");

  switch (uitheme) {
    case "mandar": {
      $('link[href*="styles/starwarsffg.css"]').prop("disabled", true);
      $("head").append('<link href="systems/starwarsffg/styles/mandar.css" rel="stylesheet" type="text/css" media="all">');
      break;
    }
    default: {
      $('link[href*="styles/starwarsffg.css"]').prop("disabled", false);
    }
  }

  // Character-defaults settings (notifyOnXpSpend, defaultObligation,
  // defaultDuty, defaultMorality, maxRarity, allowRestricted,
  // defaultCredits) now live in modules/settings/character.js (Phase 2.4).
  // Registered via registerAllSettings() above.

  // useGenericSlots setting now lives in modules/settings/combat.js
  // (Phase 2.3). The READ below stays here because it gates registering
  // FFG combat document classes during init.

  if (game.settings.get("starwarsffg", "useGenericSlots")) {
    CONFIG.ui.combat = CombatTrackerFFG;
    CONFIG.Combat.documentClass = CombatFFG;
    CONFIG.Combatant.documentClass = CombatantFFG;
    // CONFIG.Token.objectClass = TokenFFG moved out of this conditional
    // by Phase 4.2 — see comment above.
  }

  // removeCombatantAction setting now lives in modules/settings/combat.js
  // (Phase 2.3). Registered via registerAllSettings() above.

  // maxAttribute and maxSkill settings now live in
  // modules/settings/character.js (Phase 2.4). Registered via
  // registerAllSettings() above.

  // Compendium-pack source settings now live in
  // modules/settings/compendiums.js (Phase 2.2). Registered via
  // registerAllSettings() above.

  // useDefense, displaySimulation, and rollSimulation settings now live in
  // modules/settings/simulation.js (Phase 2.5). Registered via
  // registerAllSettings() above.

  // initiativeRule setting and the _setffgInitiative helper now live in
  // modules/settings/combat.js (Phase 2.3). Registered and initialized
  // via registerAllSettings() above.

  async function gameSkillsList() {
    // Static skill-list settings (addskilltheme menu + setting,
    // arraySkillList) are registered by registerAllSettings() above.
    // The dynamic skilltheme setting is registered below once choices
    // are known.

    let skillList = await parseSkillList();
    try {
      CONFIG.FFG.alternateskilllists = skillList;

      let skillChoices = {};

      skillList.forEach((list) => {
        skillChoices[list.id] = list.id;
      });

      registerSkillThemeSetting(skillChoices);

      if (game.settings.get("starwarsffg", "skilltheme") !== "starwars") {
        const altSkills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === game.settings.get("starwarsffg", "skilltheme")).skills));

        let skills = {};
        Object.keys(altSkills).forEach((skillKey) => {
          if (altSkills?.[skillKey]?.value) {
            skills[skillKey] = { ...altSkills[skillKey] };
          } else {
            skills[skillKey] = { value: skillKey, ...altSkills[skillKey] };
          }
        });

        const sorted = Object.keys(skills).sort(function (a, b) {
          const x = game.i18n.localize(skills[a].label);
          const y = game.i18n.localize(skills[b].label);

          return x < y ? -1 : x > y ? 1 : 0;
        });

        let ordered = {};
        sorted.forEach((skill) => {
          ordered[skill] = skills[skill];
        });

        CONFIG.FFG.skills = ordered;
        skillModifierTypes.forEach((modType) => {
          CONFIG.FFG.allowableModifierChoices[modType] = foundry.utils.duplicate(ordered);
        });
      }
    } catch (err) {
      console.error(err);
    }

    Hooks.on("createActor", (actor) => {
      if (actor.type !== "vehicle" && actor.type !== "homestead") {
        if (CONFIG.FFG?.alternateskilllists?.length) {
          let skilllist = game.settings.get("starwarsffg", "skilltheme");
          try {
            let skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === skilllist)));
            CONFIG.logger.log(`Applying skill theme ${skilllist} to actor`);

            if (!actor?.flags?.starwarsffg?.hasOwnProperty('ffgimportid') && JSON.stringify(Object.keys(skills.skills).sort()) !== JSON.stringify(Object.keys(actor.system.skills).sort())) {
              // only apply the skills if it wasn't an imported actor and the skills loaded are not the same
              actor.update({
                system: {
                  skills: skills.skills,
                },
              });
            }
          } catch (err) {
            CONFIG.logger.warn(err);
          }
        }
      }
    });

    Hooks.on("updateToken", async (tokenDocument, options, diffData, tokenId) => {
      if (Object.keys(options).includes('hidden')) {
        updateCombatTracker();
      }
    });

    Hooks.on("preCreateCombatant", async (combatant, context, options, combatantId) => {
      await game.combat.handleCombatantAddition(combatant, context, options, combatantId);
    });
    CONFIG.FFG.preCombatDelete = Hooks.on("preDeleteCombatant", registerHandleCombatantRemoval);
  }

  await gameSkillsList();

  FFG.configureDice();
  FFG.configureVehicleRange();

  // define custom status effects
    const allSkillChanges = {
      boost: [],
      setback: [],
      upgrade: [],
      success: [],
    };
    for (const skill of Object.keys(CONFIG.FFG.skills)) {
      allSkillChanges['boost'].push({
        key: `system.skills.${skill}.boost`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "1",
      });
      allSkillChanges['setback'].push({
        key: `system.skills.${skill}.setback`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "1",
      });
      allSkillChanges['upgrade'].push({
        key: `system.skills.${skill}.upgrades`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "1",
      });
      allSkillChanges['success'].push({
        key: `system.skills.${skill}.success`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "1",
      });
    }

    // set up our own statuses
    CONFIG.statusEffects = [];
    CONFIG.statusEffects.push({
      id: "starwarsffg-defeated",
      img: "systems/starwarsffg/images/status/defeated.svg",
      name: "SWFFG.Status.Defeated",
      changes: [],
    });

    // one-time statuses
    CONFIG.statusEffects.push({
      id: "starwarsffg-boost-once",
      img: `systems/starwarsffg/images/dice/${CONFIG.FFG.theme}/blue.png`,
      name: "SWFFG.Status.Boost.Next",
      changes: allSkillChanges['boost'],
      system: {
        duration: "once",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-setback-once",
      img: `systems/starwarsffg/images/dice/${CONFIG.FFG.theme}/black.png`,
      name: "SWFFG.Status.Setback.Next",
      changes: allSkillChanges['setback'],
      system: {
        duration: "once",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-upgrade-once",
      img: `systems/starwarsffg/images/dice/${CONFIG.FFG.theme}/yellow.png`,
      name: "SWFFG.Status.Upgrade.Next",
      changes: allSkillChanges['upgrade'],
      system: {
        duration: "once",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-success-once",
      img: `systems/starwarsffg/images/dice/${CONFIG.FFG.theme}/success.png`,
      name: "SWFFG.Status.Success.Next",
      changes: allSkillChanges['success'],
      system: {
        duration: "once",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-heavy-cover",
      img: "icons/equipment/shield/buckler-wooden-boss-lightning.webp",
      name: "SWFFG.Status.Cover.Heavy",
      changes: [
        {
          key: "system.stats.defence.melee",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "2",
        },
        {
          key: "system.stats.defence.ranged",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "2",
        },
      ],
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-disoriented",
      img: "systems/starwarsffg/images/status/disoriented.svg",
      name: "SWFFG.Status.Disoriented",
      changes: allSkillChanges['setback'],
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-immobilized",
      img: "systems/starwarsffg/images/status/immobilized.svg",
      name: "SWFFG.Status.Immobilized",
      changes: [],
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-staggered",
      img: "systems/starwarsffg/images/status/staggered.svg",
      name: "SWFFG.Status.Staggered",
      changes: [],
    });
    // combat-length statuses
    CONFIG.statusEffects.push({
      id: "starwarsffg-boost-combat",
      img: `systems/starwarsffg/images/status/blue.png`,
      name: "SWFFG.Status.Boost.Combat",
      changes: allSkillChanges['boost'],
      system: {
        duration: "combat",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-setback-combat",
      img: `systems/starwarsffg/images/status/black.png`,
      name: "SWFFG.Status.Setback.Combat",
      changes: allSkillChanges['setback'],
      system: {
        duration: "combat",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-upgrade-combat",
      img: `systems/starwarsffg/images/status/yellow.png`,
      name: "SWFFG.Status.Upgrade.Combat",
      changes: allSkillChanges['upgrade'],
      system: {
        duration: "combat",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-success-combat",
      img: `systems/starwarsffg/images/status/success.png`,
      name: "SWFFG.Status.Success.Combat",
      changes: allSkillChanges['success'],
      system: {
        duration: "combat",
      }
    });

    // custom statuses defined by the user
    try {
      const addedStatuses = $.parseJSON(game.settings.get("starwarsffg", "additionalStatuses"));
      for (const status of addedStatuses) {
        CONFIG.statusEffects.push(status);
      }

    } catch (e) {
      ui.notifications.warn("Failed to load custom statuses, likely bad JSON");
    }

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("ffg", ActorSheetFFG, { label: "Actor Sheet v1" });
  foundry.documents.collections.Actors.registerSheet("ffg", ActorSheetFFGV2, { makeDefault: true, label: "Actor Sheet v2" });
  foundry.documents.collections.Actors.registerSheet("ffg", AdversarySheetFFG, { types: ["character"], label: "Adversary Sheet v1" });
  foundry.documents.collections.Actors.registerSheet("ffg", AdversarySheetFFGV2, { types: ["character"], label: "Adversary Sheet v2" });
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("ffg", ItemSheetFFG, { label: "Item Sheet v1" });
  foundry.documents.collections.Items.registerSheet("ffg", ItemSheetFFGV2, { makeDefault: true, label: "Item Sheet v2" });

  // Add utilities to the global scope, this can be useful for macro makers
  window.DicePoolFFG = DicePoolFFG;

  // add back in the select helper (under a new name, so we don't get warnings)
  Handlebars.registerHelper({
    selectFfg: function (selected, options) {
      const escapedValue = RegExp.escape(Handlebars.escapeExpression(selected));
      const rgx = new RegExp(' value=[\"\']' + escapedValue + '[\"\']');
      const html = options.fn(this);
      return html.replace(rgx, "$& selected");
    }
  });

  // Register Handlebars utilities
  Handlebars.registerHelper("json", JSON.stringify);

  // Allows {if X = Y} type syntax in html using handlebars
  Handlebars.registerHelper("iff", function (a, operator, b, opts) {
    var bool = false;
    switch (operator) {
      case "==":
        bool = a == b;
        break;
      case ">":
        bool = a > b;
        break;
      case "<":
        bool = a < b;
        break;
      case "!=":
        bool = a != b;
        break;
      case "contains":
        if (a && b) {
          bool = a.includes(b);
        } else {
          bool = false;
        }
        break;
      default:
        throw "Unknown operator " + operator;
    }

    if (bool) {
      return opts.fn(this);
    } else {
      return opts.inverse(this);
    }
  });

  Handlebars.registerHelper("renderMultiple", function (count, obj) {
    let items = [];
    for (let i = 0; i < count; i += 1) {
      items.push(obj);
    }

    return new Handlebars.SafeString(items.join(""));
  });

  Handlebars.registerHelper("calculateSpecializationTalentCost", function (idString) {
    const id = parseInt(idString.replace("talent", ""), 10);

    const cost = (Math.trunc(id / 4) + 1) * 5;

    return cost;
  });

  Handlebars.registerHelper("calculateSignatureAbilityCost", function (idString) {
    const id = parseInt(idString.replace("upgrade", ""), 10);

    const cost = (Math.trunc(id / 4) + 2) * 5;

    return cost;
  });

  Handlebars.registerHelper("math", function (lvalue, operator, rvalue, options) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);

    return {
      "+": lvalue + rvalue,
      "-": lvalue - rvalue,
      "*": lvalue * rvalue,
      "/": lvalue / rvalue,
      "%": lvalue % rvalue,
    }[operator];
  });

  Handlebars.registerHelper("contains", function (obj1, property, value, opts) {
    let bool = false;
    if (Array.isArray(obj1) || obj1 instanceof Collection) {
      bool = obj1.some((e) => e[property] === value);
    } else if (typeof obj1 === "object") {
      bool = Object.keys(obj1).some(function (k) {
        return obj1[k][property] === value;
      });
    } else if (typeof obj1 === "string") {
      return obj1.includes(property);
    }

    if (bool) {
      return opts.fn(this);
    } else {
      return opts.inverse(this);
    }
  });

  Handlebars.registerHelper("keylen", function (obj) {
    try {
      return Object.keys(obj).length;
    } catch (e) {
      return 0;
    }
  });

  Handlebars.registerHelper("in", function (value, array) {
    if (!Array.isArray(array)) {
      return false;
    }
    return array.indexOf(value) >= 0;
  });

  Handlebars.registerHelper("ffgDiceSymbols", function (text) {
    //return PopoutEditor.renderDiceImages(text);
    CONFIG.logger.warn("This function is no longer needed and should not be called. Please notify the devs if you see this message.");
    return text;
  });

  Handlebars.registerHelper("object", function ({ hash }) {
    return hash;
  });
  Handlebars.registerHelper("array", function () {
    return Array.from(arguments).slice(0, arguments.length - 1);
  });

  Handlebars.registerHelper("defaultImage", function(img) {
    return ["icons/svg/mystery-man.svg", "icons/svg/item-bag.svg"].includes(img);
  });

  Handlebars.registerHelper('each_when', function(list, propName, value, options) {
    let result = '';
    for(let i = 0; i < list.length; ++i)
        if(list[i][propName] == value)
            result += options.fn({item: list[i]});

    return result.length > 0 ? result : options.inverse();
  });


  await TemplateHelpers.preload();
});

// renderChatInput hook now lives in modules/hooks/render-chat-input.js
// (Phase 3.3). Registered via registerAllHooks() above.

// renderActorDirectory hook now lives in
// modules/hooks/render-actor-directory.js (Phase 3.4). Registered via
// registerAllHooks() above.

// renderCompendiumDirectory hook now lives in
// modules/hooks/render-compendium-directory.js (Phase 3.5). Registered
// via registerAllHooks() above.

// renderChatMessage hook now lives in
// modules/hooks/render-chat-message.js (Phase 3.6). Registered via
// registerAllHooks() above.

// dropActorSheetData hook now lives in
// modules/hooks/drop-actor-sheet-data.js (Phase 3.7). Registered via
// registerAllHooks() above.

function isCurrentVersionNullOrBlank(currentVersion) {
  return currentVersion === "null" || currentVersion === '' || currentVersion === null;
}

// Handle migration duties
Hooks.once("ready", async () => {
  SettingsHelpers.readyLevelSetting();

  // NOTE: the "currentVersion" will be updated in handleUpdate, preventing the code below from running in the future
  // this is intended to encourage migrating code to this file to clean up the main file
  await handleUpdate();

  const currentVersion = game.settings.get("starwarsffg", "systemMigrationVersion");

  const version = game.system.version;
  const isAlpha = game.system.version.includes("alpha");

  if (isAlpha && game.user.isGM) {
    let d = new Dialog({
      title: "Warning",
      content: "<p>This is an alpha release of the system.  It is not recommended for regular gameplay. <b>There will be bugs.</b> <br><br>Check Discord or the GitHub repo for the latest stable version.</p>",
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: "I understand",
          callback: () => console.log("Chose One") // leaving in case I get feedback to update a game setting to not show this on every load
        }
      },
      default: "one",
    });
    d.render(true);
  }

  if ((isAlpha || isCurrentVersionNullOrBlank(currentVersion) || parseFloat(currentVersion) < parseFloat(game.system.version)) && game.user.isGM) {
    CONFIG.logger.log(`Migrating to from ${currentVersion} to ${game.system.version}`);

    // Calculating wound and strain .value from .real_value is no longer necessary due to the Token._drawBar() override in swffg-main.js
    // This is a temporary migration check to transfer existing actors .real_value back into the correct .value location.
    game.actors.forEach((actor) => {
      if (actor.type === "character" || actor.type === "minion") {
        if (actor.system.stats.wounds.real_value != null) {
          actor.system.stats.wounds.value = actor.system.stats.wounds.real_value;
          game.actors.get(actor.id).update({ ["system.stats.wounds.real_value"]: null });
          CONFIG.logger.log("Migrated stats.wounds.value from stats.wounds.real_value");
          CONFIG.logger.log(actor.system.stats.wounds);
        }
        if (actor.system.stats.strain.real_value != null) {
          actor.system.stats.strain.value = actor.system.stats.strain.real_value;
          game.actors.get(actor.id).update({ ["system.stats.strain.real_value"]: null });
          CONFIG.logger.log("Migrated stats.strain.value from stats.strain.real_value");
          CONFIG.logger.log(actor.system.stats.strain);
        }

        // migrate all character to using current skill list if not default.
        let skilllist = game.settings.get("starwarsffg", "skilltheme");

        if (CONFIG.FFG?.alternateskilllists?.length) {
          try {
            let skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === skilllist)));
            CONFIG.logger.log(`Applying skill theme ${skilllist} to actor ${actor.name}`);

            Object.keys(actor.system.skills).forEach((skill) => {
              if (!skills.skills[skill] && !actor.system.skills?.[skill]?.nontheme) {
                skills.skills[`-=${skill}`] = null;
              } else {
                skills.skills[skill] = {
                  ...skills.skills[skill],
                  ...actor.system.skills[skill],
                };
              }
            });

            actor.update({
              data: {
                skills: skills.skills,
              },
            });
          } catch (err) {
            CONFIG.logger.warn(err);
          }
        }
      }
    });

    if (isAlpha || isCurrentVersionNullOrBlank(currentVersion) || parseFloat(currentVersion) < 1.1) {
      // Migrate alternate skill lists from file if found
      try {
        let skillList = [];

        let data = await foundry.applications.apps.FilePicker.browse("data", `worlds/${game.world.id}`, { bucket: null, extensions: [".json", ".JSON"], wildcard: false });
        if (data.files.includes(`worlds/${game.world.id}/skills.json`)) {
          // if the skills.json file is found AND the skillsList in setting is the default skill list then read the data from the file.
          // This will make sure that the data from the JSON file overwrites the data in the setting.
          if ((await game.settings.get("starwarsffg", "arraySkillList")) === defaultSkillList) {
            const fileData = await fetch(`/worlds/${game.world.id}/skills.json`).then((response) => response.json());
            await game.settings.set("starwarsffg", "arraySkillList", JSON.stringify(fileData));
            skillList = fileData;
          }
        } else {
          skillList = await parseSkillList();
        }

        CONFIG.FFG.alternateskilllists = skillList;
        if (game.settings.get("starwarsffg", "skilltheme") !== "starwars") {
          const altSkills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === game.settings.get("starwarsffg", "skilltheme")).skills));

          let skills = {};
          Object.keys(altSkills).forEach((skillKey) => {
            if (altSkills?.[skillKey]?.value) {
              skills[skillKey] = { ...altSkills[skillKey] };
            } else {
              skills[skillKey] = { value: skillKey, ...altSkills[skillKey] };
            }
          });

          const sorted = Object.keys(skills).sort(function (a, b) {
            const x = game.i18n.localize(skills[a].abrev);
            const y = game.i18n.localize(skills[b].abrev);

            return x < y ? -1 : x > y ? 1 : 0;
          });

          let ordered = {};
          sorted.forEach((skill) => {
            ordered[skill] = skills[skill];
          });

          CONFIG.FFG.skills = ordered;
        }
      } catch (err) {
        CONFIG.logger.error(err);
      }
    }
    // migrate embedded items
    if (isAlpha || isCurrentVersionNullOrBlank(currentVersion) || parseFloat(currentVersion) < 1.8) {
      ui.notifications.info(`Migrating Star Wars FFG System Deep Embedded Items`);
      CONFIG.logger.debug('Migrating Star Wars FFG System Deep Embedded Items');

      // items owned by actors
      game.actors.forEach((actor) => {
        let update_data = [];
        actor.items.forEach((item) => {
          let updated_item = item.toObject(true);
          if (["weapon", "armour", "shipweapon"].includes(item.type)) {
            // iterate over attachments and modifiers on the item
            updated_item.system.itemmodifier.map((modifier) => {
              if (modifier !== null && modifier?.hasOwnProperty('data')) {
                modifier.system = modifier.data;
                delete modifier.data;
              }
            });

            updated_item.system.itemattachment.map((attachment) => {
              if (attachment !== null && attachment.hasOwnProperty('data')) {
                attachment.system = attachment.data;
                delete attachment.data;
              }
            });
            // push the updated items to the list of items to update
            update_data.push(updated_item);
          }
        });
        if (!foundry.utils.isEmpty(update_data)) {
          // persist the changes for items owned by this actor to the DB
          actor.update({items: update_data});
        }
      });
      // move on to items in the world
      game.items.forEach((item) => {
        let updated = false;
        let updated_item = item.toObject(true);
        if (["weapon", "armour", "shipweapon"].includes(item.type)) {
          // iterate over attachments and modifiers on the item
          updated_item.system.itemmodifier.map((modifier) => {
            if (modifier?.hasOwnProperty('data')) {
              updated = true;
              modifier.system = modifier.data;
              delete modifier.data;
            }
          });

          updated_item.system.itemattachment.map((attachment) => {
            if (attachment.hasOwnProperty('data')) {
              updated = true;
              attachment.system = attachment.data;
              delete attachment.data;
            }
          });
        }
        if (updated && !foundry.utils.isEmpty(updated_item)) {
          // persist the changes to the DB
          item.update(updated_item);
        }
      });
      CONFIG.logger.debug('Migration of Star Wars FFG System Deep Embedded Items completed!');
      ui.notifications.info(`Migration of Star Wars FFG System Deep Embedded Items completed!`);
    }

    // migrate compendiums and flags
    if (isAlpha || isCurrentVersionNullOrBlank(currentVersion) || parseFloat(currentVersion) < 1.61) {
      ui.notifications.info(`Migrating Starwars FFG System for version ${game.system.version}. Please be patient and do not close your game or shut down your server.`, { permanent: true });

      try {

        // Update old pack to latest data model
          // TODO: uncomment
        //for (let pack of game.packs) {
        //  await pack.migrate();
        //}

        // Copy old flags to new system scope
        FlagMigrationHelpers.migrateFlags()

        ui.notifications.info(`Starwars FFG System Migration to version ${game.system.version} completed!`, { permanent: true });
      } catch (err) {
        CONFIG.logger.error(`Error during system migration`, err);
      }
    }
    if (isAlpha || isCurrentVersionNullOrBlank(currentVersion) || parseFloat(currentVersion) < 1.805) {
      // update skill sets
      ui.notifications.info('Updating skill groupings, please be patient...');
      try {
        const skillTheme = game.settings.get("starwarsffg", "skilltheme");
        if (skillTheme === 'starwars') {
          const skills = CONFIG.FFG.alternateskilllists.find((list) => list.id === skillTheme).skills;
          const actors = game.actors.filter(i => i.type === 'character' || i.type === 'minion');
          for (const actor of actors) {
            for (const skillName of Object.keys(actor.system.skills)) {
              let skillData = actor.system.skills[skillName];
              if (skillData.type !== skills[skillName].type) {
                skillData.type = skills[skillName].type;
                await actor.update({[`system.skills.${skillName}.type`]: skillData.type});
              }
            }
          }
        }
      } catch (error) {
        CONFIG.logger.warn(error);
      }
      ui.notifications.info('Done updating skill groupings!');
    }
  }

  // enable functional testing
  if (game.user.isGM && window.location.href.includes("localhost") && game?.data?.system?.data?.test) {
    const command = `
      const testing = import('/systems/starwarsffg/tests/ffg-tests.js').then((mod) => {
      const tester = new mod.default();
      tester.render(true);
    });
    `;

    const macro = {
      name: "Functional Testing",
      type: "script",
      command: command,
    };

    const macroExists = game.macros.entities.find((m) => m.name === macro.name);
    if (!macroExists) {
      Macro.create(macro);
    }
  }

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", async (bar, data, slot) => await createFFGMacro(bar, data, slot));
  Hooks.on("createMacro", async function (...args) {
    args[0] = await updateMacro(args[0]);
    return args;
  });

  Hooks.on("closeItemSheetFFG", (item) => {
    Hooks.call(`closeAssociatedTalent_${item.object._id}`, item);
  });

  Hooks.on("createItem", async (item, options, userId) => {
    if (userId != game.user.id) return
    // add talents from species to character
    if (item.isEmbedded && item.parent.documentName === "Actor") {
      const actor = item.actor
      if (item.type === "species" && actor.type === "character") {
        const toAdd = [];
        // talents
        for(const talentId of Object.keys(item.system.talents)) {
          const talentUuid = item.system.talents[talentId].source;
          const talent = await fromUuid(talentUuid);
          if (talent) {
            toAdd.push(talent);
          }
        }
        // abilities
        for(const abilityId of Object.keys(item.system.abilities)) {
          const abilityData = item.system.abilities[abilityId];
          const abilityItem = await new Item(
            {
              name: abilityData.name,
              type: "ability",
              system: {
                description: abilityData.system.description,
                fromSpecies: item.id,
              }
            },
            {
              temporary: true,
            },
          );
          toAdd.push(abilityItem);
        }
        if (toAdd.length > 0) {
          const created = await actor.createEmbeddedDocuments("Item", toAdd);
          created.forEach(created_item => {
            // mark the items as coming from a species
            created_item.update({flags: {starwarsffg: {fromSpecies: true}}});
          });
        }
      }
    }
  });
  // data for _onDropItemCreate has system.encumbrance.adjusted = 0, despite it being proper in the item itself
  Hooks.on("deleteItem", async (item, options, userId) => {
    if (userId != game.user.id) return
    // remove talents, abilities added by species
    if (item.isEmbedded && item.parent.documentName === "Actor") {
      const actor = item.actor
      if (item.type === "species" && actor.type === "character") {
        const grantedXp = item.system.startingXP;
        const currentAvailable = actor.system.experience.available;
        const currentTotal = actor.system.experience.total;
        await actor.update({"system.experience": {
          available: currentAvailable - grantedXp,
          total: currentTotal - grantedXp,
        }});
        await xpLogUndo(
          actor,
          grantedXp,
          currentAvailable - grantedXp,
          currentTotal - grantedXp,
        );
        const toDelete = [];
        for(const talentId of Object.keys(item.system.talents)) {
          const speciesTalent = item.system.talents[talentId];
          const actorTalent = actor.items.find(i => i.name === speciesTalent.name && i.type === "talent");
          if (actorTalent) {
            toDelete.push(actorTalent.id);
          }
        }
        // build the abilities list
        for (const ability of actor.items.filter(i => i.type === "ability" && i.system?.fromSpecies === item.id)) {
          toDelete.push(ability.id);
        }
        if (toDelete.length > 0) {
          actor.deleteEmbeddedDocuments("Item", toDelete);
        }
      }
    }
  });

  // Display Destiny Pool
  let destinyPool = { light: game.settings.get("starwarsffg", "dPoolLight"), dark: game.settings.get("starwarsffg", "dPoolDark") };

  // future functionality to allow multiple menu items to be passed to destiny pool
  const defaultDestinyMenu = [
    {
      name: game.i18n.localize("SWFFG.GroupManager"),
      icon: '<i class="fas fa-users"></i>',
      callback: () => {
        new GroupManager().render(true);
      },
      minimumRole: CONST.USER_ROLES.GAMEMASTER,
    },
    {
      name: game.i18n.localize("SWFFG.RequestDestinyRoll"),
      icon: '<i class="fas fa-dice-d20"></i>',
      callback: (li) => {
        const messageText = `<button class="ffg-destiny-roll">${game.i18n.localize("SWFFG.DestinyPoolRoll")}</button>`;

        new Map([...game.settings.settings].filter(([k, v]) => v.key.includes("destinyrollers"))).forEach((i) => {
          game.settings.set(i.namespace, i.key, undefined);
        });

        CONFIG.FFG.DestinyGM = game.user.id;

        ChatMessage.create({
          user: game.user.id,
          content: messageText,
        });
      },
      minimumRole: CONST.USER_ROLES.GAMEMASTER,
    },
  ];
  const dTracker = new DestinyTracker(undefined, { menu: defaultDestinyMenu });

  dTracker.render(true);

  await registerCrewMainSettings();
  registerTokenControls();

  if (game.settings.get("starwarsffg", "useGenericSlots")) {

    game.socket.on("system.starwarsffg", async (...args) => {
      const event_type = args[0].event;
      if (game.user.id === game.users.activeGM?.id) {
        if (event_type === "combat") {
          CONFIG.logger.debug("Processing combat event from player");
          const data = args[0]?.data;
          CONFIG.logger.debug(`Received data: ${data.combatId}, ${data.round}, ${data.slot}, ${data.combatantId}`);
          const combat = game.combats.get(data.combatId);
          await combat.claimSlot(data.round, data.slot, data.combatantId);
        }
      } else if (event_type === "trackerRender") {
        CONFIG.logger.debug("Received combat tracker rerender request");
        const incomingCombatID = args[0].combatId;
        const incomingCombat = game.combats.get(incomingCombatID);
        incomingCombat.debounceRender();
        incomingCombat.setupTurns();
      }
    });


  }

  Hooks.on("refreshToken", (token) => {
    /*
    Used to render minion count
    */
    if (token?.actor?.type === "minion") {
      drawMinionCount(token);
    }
    if (["character", "nemesis", "rival"].includes(token?.actor?.type)) {
      drawAdversaryCount(token);
    }
    return token;
  });
  // set up support for Status Icon Counters
  const counterApi = game.modules.get("statuscounter")?.active;
  if (counterApi) {
    Hooks.on("updateActiveEffect", function(effect, changes) {
        const counterValue = foundry.utils.getProperty(changes, "flags.statuscounter.counter.value");
        if (counterValue) {
          for (const change of effect.changes) {
            change['value'] = counterValue;
          }
        }
        effect.update({changes: effect.changes});
    });
  }

  const turnMarkerConfigured = game.settings.get("starwarsffg", "configuredTurnMarker");
  const combatTrackerConfig = game.settings.get("core", "combatTrackerConfig");
  if (combatTrackerConfig.turnMarker.enabled && !turnMarkerConfigured) {
    await game.settings.set("starwarsffg", "configuredTurnMarker", true);
    combatTrackerConfig.turnMarker.enabled = false;
    await game.settings.set("core", "combatTrackerConfig", combatTrackerConfig);
  }

  // handle character creation requests
  if (game.user.isGM && game.user.id === game.users.find(u => u.isGM && u.active).id) {
    game.socket.on("system.starwarsffg", async (...args) => {
      CONFIG.logger.debug("Processing PC wizard from player");
      if (args[0]?.eventType === "pcWizard") {
        const requestor = args[1];
        const requestorName = game.users.get(requestor).name;
        const actorName = `temp actor - ${requestorName}`;
        if (args[0]?.event === "createCharacterRequest") {
          CONFIG.logger.debug("create Character request, deleting old copies...");
          // delete previous (temporary) copies of the actor
          const existingActor = game.actors.getName(actorName);
          if (existingActor) {
            await existingActor.delete();
          }

          CONFIG.logger.debug("creating new temporary copy...");
          // create a new temporary actor
          const tempActor = await Actor.create(
            {
              name: actorName,
              type: "character",
              displaySheet: false,
              ownership: {
                [requestor]: foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
              },
            },
          );

          CONFIG.logger.debug("Returning event to player");
          // notify the user that their actor is ready
          game.socket.emit("system.starwarsffg", {
            eventType: "pcWizard",
            event: "createCharacterResponse",
            actorId: tempActor.id,
          });

        } else if (args[0]?.event === "deleteCharacter") {
          CONFIG.logger.debug("Deleting old copies...");
          // delete temporary copies of the actor
          const existingActor = game.actors.getName(actorName);
          if (existingActor) {
            await existingActor.delete();
          }

          CONFIG.logger.debug("Returning event to player...r");
          // notify the user that the actor has been deleted
          game.socket.emit("system.starwarsffg", {
            eventType: "pcWizard",
            event: "deleteCharacterResponse",
          });
        } else if (args[0]?.event === "createFinalActorRequest") {
          CONFIG.logger.debug("Processing final actor request from player");
          // create a new temporary actor
          const newActor = await Actor.create(
            {
              name: `${requestorName}'s new PC!`,
              type: "character",
              displaySheet: false,
              ownership: {
                [requestor]: foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
              },
            },
          );

          CONFIG.logger.debug("Returning event to player...");
          // notify the user that their actor is ready
          game.socket.emit("system.starwarsffg", {
            eventType: "pcWizard",
            event: "createFinalActorResponse",
            actorId: newActor.id,
          });
        }
      }
    });
  }
});

Hooks.once("diceSoNiceReady", (dice3d) => {
  let dicetheme = game.settings.get("starwarsffg", "dicetheme");
  if (!dicetheme || dicetheme == "starwars") {
    dice3d.addSystem({ id: "swffg", name: "Star Wars FFG" }, true);

    //swffg dice
    dice3d.addDicePreset(
      {
        type: "da",
        labels: ["", "s", "s", "s\ns", "a", "a", "s\na", "a\na"],
        font: "SWRPG-Symbol-Regular",
        colorset: "green",
        system: "swffg",
      },
      "d8"
    );

    dice3d.addDicePreset(
      {
        type: "di",
        labels: ["", "f", "f\nf", "t", "t", "t", "t\nt", "f\nt"],
        font: "SWRPG-Symbol-Regular",
        colorset: "purple",
        system: "swffg",
      },
      "d8"
    );

    dice3d.addDicePreset(
      {
        type: "dp",
        labels: ["", "s", "s", "s\ns", "s\ns", "a", "s\na", "s\na", "s\na", "a\na", "a\na", "x"],
        font: "SWRPG-Symbol-Regular",
        colorset: "yellow",
        system: "swffg",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "dc",
        labels: ["", "f", "f", "f\nf", "f\nf", "t", "t", "f\nt", "f\nt", "t\nt", "t\nt", "y"],
        font: "SWRPG-Symbol-Regular",
        colorset: "red",
        system: "swffg",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "df",
        labels: ["\nz", "\nz", "\nz", "\nz", "\nz", "\nz", "z\nz", "\nZ", "\nZ", "Z\nZ", "Z\nZ", "Z\nZ"],
        font: "SWRPG-Symbol-Regular",
        colorset: "white-sw",
        system: "swffg",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "db",
        labels: ["", "", "s", "s  \n  a", "a  \n  a", "a"],
        font: "SWRPG-Symbol-Regular",
        colorset: "blue",
        system: "swffg",
      },
      "d6"
    );

    dice3d.addDicePreset(
      {
        type: "ds",
        labels: ["", "", "f", "f", "t", "t"],
        font: "SWRPG-Symbol-Regular",
        colorset: "black-sw",
        system: "swffg",
      },
      "d6"
    );
  } else {
    //genesys
    dice3d.addSystem({ id: "genesys", name: "Genesys" }, true);

    dice3d.addDicePreset(
      {
        type: "da",
        labels: ["", "s", "s", "s\ns", "a", "a", "s\na", "a\na"],
        font: "Genesys",
        colorset: "green",
        system: "genesys",
      },
      "d8"
    );

    dice3d.addDicePreset(
      {
        type: "di",
        labels: ["", "f", "f\nf", "h", "h", "h", "h\nh", "f\nh"],
        font: "Genesys",
        colorset: "purple",
        system: "genesys",
      },
      "d8"
    );

    dice3d.addDicePreset(
      {
        type: "dp",
        labels: ["", "s", "s", "s\ns", "s\ns", "a", "s\na", "s\na", "s\na", "a\na", "a\na", "t"],
        font: "Genesys",
        colorset: "yellow",
        system: "genesys",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "dc",
        labels: ["", "f", "f", "f\nf", "f\nf", "h", "h", "f\nh", "f\nh", "h\nh", "h\nh", "d"],
        font: "Genesys",
        colorset: "red",
        system: "genesys",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "df",
        labels: ["\nz", "\nz", "\nz", "\nz", "\nz", "\nz", "z\nz", "\nZ", "\nZ", "Z\nZ", "Z\nZ", "Z\nZ"],
        font: "SWRPG-Symbol-Regular",
        colorset: "white-sw",
        system: "genesys",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "db",
        labels: ["", "", "s", "s  \n  a", "a  \n  a", "a"],
        font: "Genesys",
        colorset: "blue",
        system: "genesys",
      },
      "d6"
    );

    dice3d.addDicePreset(
      {
        type: "ds",
        labels: ["", "", "f", "f", "h", "h"],
        font: "Genesys",
        colorset: "black-sw",
        system: "genesys",
      },
      "d6"
    );
  }

  //sw dice colors
  dice3d.addColorset({
    name: "yellow",
    description: "SWFFG Yellow",
    category: "Colors",
    foreground: "#000000",
    background: "#e1aa12",
  });

  dice3d.addColorset({
    name: "blue",
    description: "SWFFG Blue",
    category: "Colors",
    foreground: "#000000",
    background: "#5789aa",
  });

  dice3d.addColorset({
    name: "red",
    description: "SWFFG Red",
    category: "Colors",
    foreground: "#ffffff",
    background: "#7c151e",
  });

  dice3d.addColorset({
    name: "green",
    description: "SWFFG Green",
    category: "Colors",
    foreground: "#000000",
    background: "#127e12",
  });

  dice3d.addColorset({
    name: "purple",
    description: "SWFFG purple",
    category: "Colors",
    foreground: "#ffffff",
    background: "#6d1287",
  });

  dice3d.addColorset({
    name: "black-sw",
    description: "SWFFG black",
    category: "Colors",
    foreground: "#ffffff",
    background: "#000000",
  });

  dice3d.addColorset({
    name: "white-sw",
    description: "SWFFG white",
    category: "Colors",
    foreground: "#000000",
    background: "#ffffff",
  });
});

// renderGamePause hook now lives in modules/hooks/render-game-pause.js
// (Phase 3.9). Registered via registerAllHooks() above.

// registerCrewRoles() now lives in modules/settings/crew-main-settings.js
// (Phase 2.7) as registerCrewMainSettings(). Imported and called at the
// previous call site in the ready hook.

/**
 * Check if all built-in compendiums are empty or not
 * @returns {Promise<boolean>}
 */
async function compendiumsEmpty() {
  const compendiums = game.packs.contents.filter(i => i.collection.includes("starwars"));
  for (const compendium of compendiums) {
    if ((await compendium.getDocuments()).length !== 0) {
      return false;
    }
  }

  return compendiums.length > 0;
}

/**
 * Give a custom, Star Wars FFG tooltip when qualities, attachments, upgrades, etc are hovered (after sending to chat)
 * @param event
 */
export function itemPillHover(event) {
  event.preventDefault();
  const li = $(event.currentTarget);
  const itemName = li.data("item-embed-name");
  const itemImage = li.data("item-embed-img");
  const itemType = li.data("item-type");
  const itemRanks = li.data("item-ranks");
  let desc = li.data("desc");
  let descRanks = "";
  if (itemType === "itemattachment") {
    const rarity = li.data("rarity");
    const price = li.data("price");
    if (price) {
      desc = `<span class="statt" title="Price"><i class="fa-solid fa-dollar-sign"></i>${price}</span>${desc}`
    }
    if (rarity) {
      desc = `<span class="stat stat-right" title="Rarity"><i class="fa-solid fa-magnifying-glass"></i>${rarity}</span>${desc}`
    }

    // if the item has embedded mods, pull the data and add it to the description
    let modNames = li.data("mod-names");
    let modDescs = li.data("mod-descs");
    let modActives = li.data("mod-actives");
    if (modNames) {
      modNames = modNames.split("~");
      modDescs = modDescs.split("~");
      modActives = modActives.split("~");
      CONFIG.logger.debug(modNames);
      CONFIG.logger.debug(modDescs);
      CONFIG.logger.debug(modActives);
      let newDesc = `<hr><b>Mods</b>:<br>`;
      for (let i = 0; i < modNames.length - 1; i++) {
        if (modActives[i] === "true") {
          modNames[i] = `<i class="fa-solid fa-user-check" title="Installed"></i>&nbsp;${modNames[i]}`;
        } else {
          modNames[i] = `<i class="fa-duotone fa-solid fa-user-xmark" title="Not Installed"></i>&nbsp;${modNames[i]}`;
        }
        newDesc += `<u>${modNames[i]}</u>:&nbsp;${modDescs[i]}<br>`;
      }
      desc += newDesc;
    }
  }
  if (itemRanks > 0) {
    descRanks = `${itemRanks} ranks`;
  } else {
    if (!["specialization", "signatureAbility", "itemattachment"].includes(itemType)) {
      descRanks = "Not ranked";
    }
  }
  let embeddedContent = `
    <section class="chat-msg-tooltip content">
      <section class="header">
        <img class="tooltip-img" src="${itemImage}"/>
        <div class="title">${itemName}</div>
      </section>
      <section class="description">
        ${desc}
      </section>
      <section class="ranks">
        ${descRanks}
      </section>
    </section>
  `;
  if (itemType !== undefined) {
    li.attr("data-tooltip", embeddedContent);
  }
}
