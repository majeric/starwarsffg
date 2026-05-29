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
import { NemesisData } from "./actor/nemesis-data.js";
import { CharacterData } from "./actor/character-data.js";
import { VehicleData } from "./actor/vehicle-data.js";
import { CriticalInjuryData } from "./item/criticalinjury-data.js";
import { CriticalDamageData } from "./item/criticaldamage-data.js";
import { MotivationData } from "./item/motivation-data.js";
import { ObligationData } from "./item/obligation-data.js";
import { BackgroundData } from "./item/background-data.js";
import { SpeciesData } from "./item/species-data.js";
import { CareerData } from "./item/career-data.js";
import { AbilityData } from "./item/ability-data.js";
import { GearData } from "./item/gear-data.js";
import { TalentData } from "./item/talent-data.js";
import { SpecializationData } from "./item/specialization-data.js";
import { ForcePowerData } from "./item/forcepower-data.js";
import { SignatureAbilityData } from "./item/signatureability-data.js";
import { WeaponData } from "./item/weapon-data.js";
import { ArmourData } from "./item/armour-data.js";
import { ShipWeaponData } from "./item/shipweapon-data.js";
import { ItemAttachmentData } from "./item/itemattachment-data.js";
import { ItemModifierData } from "./item/itemmodifier-data.js";

const ACTOR_DATA_MODELS = {
  homestead: HomesteadData,
  minion: MinionData,
  rival: RivalData,
  nemesis: NemesisData,
  character: CharacterData,
  vehicle: VehicleData,
};

const ITEM_DATA_MODELS = {
  criticalinjury: CriticalInjuryData,
  criticaldamage: CriticalDamageData,
  motivation: MotivationData,
  obligation: ObligationData,
  background: BackgroundData,
  species: SpeciesData,
  career: CareerData,
  ability: AbilityData,
  gear: GearData,
  talent: TalentData,
  specialization: SpecializationData,
  forcepower: ForcePowerData,
  signatureability: SignatureAbilityData,
  weapon: WeaponData,
  armour: ArmourData,
  shipweapon: ShipWeaponData,
  itemattachment: ItemAttachmentData,
  itemmodifier: ItemModifierData,
};

export function registerDataModels() {
  for (const [type, model] of Object.entries(ACTOR_DATA_MODELS)) {
    CONFIG.Actor.dataModels[type] = model;
  }
  for (const [type, model] of Object.entries(ITEM_DATA_MODELS)) {
    CONFIG.Item.dataModels[type] = model;
  }
}
