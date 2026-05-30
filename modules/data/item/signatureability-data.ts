import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";

function upgradesInitial() {
  const upgrades = {};
  for (let index = 0; index < 8; index += 1) {
    upgrades[`upgrade${index}`] = {};
  }
  return upgrades;
}

function uplinkNodes() {
  const { SchemaField, BooleanField } = foundry.data.fields;
  return new SchemaField({
    uplink0: new BooleanField({ initial: false }),
    uplink1: new BooleanField({ initial: false }),
    uplink2: new BooleanField({ initial: false }),
    uplink3: new BooleanField({ initial: false }),
  });
}

/**
 * DataModel for the `signatureability` item type. Upgrade entries remain
 * free-form; uplink nodes are fixed booleans rendered by the sheet.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class SignatureAbilityData extends BaseItemData {
  static defineSchema(): foundry.data.fields.DataSchema {
    const { ObjectField, NumberField } = foundry.data.fields;
    return {
      ...core(),
      upgrades: new ObjectField({ initial: upgradesInitial() }),
      base_cost: new NumberField({ initial: 0 }),
      uplink_nodes: uplinkNodes(),
    };
  }
}
