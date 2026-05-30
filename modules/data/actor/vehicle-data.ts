import { BaseActorData } from "./base-actor-data.js";
import { biography } from "../shared/actor-biography.js";
import { metaOnly } from "../shared/actor-meta.js";

/**
 * The vehicle `stats` block is unique to vehicles (silhouette, speed, hull
 * trauma, shields, etc.) and shares nothing with the humanoid stats template,
 * so it is defined here rather than via the shared `statsSchema` fragment. The
 * `adjusted` subfields (armour/encumbrance/cost/rarity/customizationHardPoints)
 * move to the derived namespace in Phase 6; kept in the schema for now (ADR-002).
 */
function vehicleStatsSchema() {
  const { SchemaField, NumberField, StringField, BooleanField, ObjectField } = foundry.data.fields;
  const num = (initial = 0) => new NumberField({ initial });
  return new SchemaField({
    silhouette: new SchemaField({ value: num(1) }),
    speed: new SchemaField({ value: num(), max: num() }),
    handling: new SchemaField({ value: num() }),
    hullTrauma: new SchemaField({ value: num(), min: num(), max: num(10) }),
    systemStrain: new SchemaField({ value: num(), min: num(), max: num(10) }),
    shields: new SchemaField({ fore: num(), port: num(), starboard: num(), aft: num() }),
    armour: new SchemaField({ value: num(), adjusted: num() }),
    sensorRange: new SchemaField({ value: new StringField({ initial: "Short" }) }),
    crew: new ObjectField(),
    passengerCapacity: new SchemaField({ value: num() }),
    encumbrance: new SchemaField({ value: num(), min: num(), max: num(10), adjusted: num() }),
    cost: new SchemaField({ value: num(), adjusted: num() }),
    rarity: new SchemaField({ value: num(), isrestricted: new BooleanField({ initial: false }), adjusted: num() }),
    customizationHardPoints: new SchemaField({ value: num(), adjusted: num() }),
    hyperdrive: new SchemaField({ value: num(1) }),
    consumables: new SchemaField({ value: num(1), duration: new StringField({ initial: "months" }) }),
    navicomputer: new SchemaField({ value: new BooleanField({ initial: false }) }),
  });
}

/**
 * DataModel for the `vehicle` actor type. Templates: biography, attributes,
 * meta_only, plus the vehicle-specific stats block and the top-level
 * `spaceShip`/`silhouetteImage` fields. Schema-only per ADR-010.
 */
export class VehicleData extends BaseActorData {
  static defineSchema(): foundry.data.fields.DataSchema {
    const { StringField, BooleanField } = foundry.data.fields;
    return {
      ...biography(),
      ...metaOnly(),
      stats: vehicleStatsSchema(),
      spaceShip: new BooleanField({ initial: false }),
      silhouetteImage: new StringField({ initial: "systems/starwarsffg/images/shipdefence.png" }),
    };
  }
}
