import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";

function upgradesInitial() {
  const upgrades: Record<string, any> = {};
  for (let index = 0; index < 16; index += 1) {
    upgrades[`upgrade${index}`] = {};
  }
  return upgrades;
}

/**
 * DataModel for the `forcepower` item type. Upgrade entries remain free-form
 * because each slot stores varied imported/editor-created upgrade data.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class ForcePowerData extends BaseItemData {
  static defineSchema(): foundry.data.fields.DataSchema {
    const { ObjectField, NumberField } = foundry.data.fields;
    return {
      ...core(),
      upgrades: new ObjectField({ initial: upgradesInitial() }),
      required_force_rating: new NumberField({ initial: 0 }),
      base_cost: new NumberField({ initial: 0 }),
    };
  }
}
