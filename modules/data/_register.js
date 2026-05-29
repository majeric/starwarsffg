/**
 * Register actor- and item-type data models with Foundry's CONFIG.
 *
 * Each per-type DataModel subclass is added to ACTOR_DATA_MODELS or
 * ITEM_DATA_MODELS as it lands in Phase 5. The registration function
 * is called once from swffg-main.js during init, after the Actor and
 * Item document classes are configured.
 *
 * Until all types are converted, Foundry falls back to template.json
 * for any type not registered here.
 */

import { HomesteadData } from "./actor/homestead-data.js";
import { MinionData } from "./actor/minion-data.js";
import { RivalData } from "./actor/rival-data.js";

const ACTOR_DATA_MODELS = {
  homestead: HomesteadData,
  minion: MinionData,
  rival: RivalData,
};

const ITEM_DATA_MODELS = {
  // populated by Phase 5 tasks 5.8-5.17
};

export function registerDataModels() {
  for (const [type, model] of Object.entries(ACTOR_DATA_MODELS)) {
    CONFIG.Actor.dataModels[type] = model;
  }
  for (const [type, model] of Object.entries(ITEM_DATA_MODELS)) {
    CONFIG.Item.dataModels[type] = model;
  }
}
