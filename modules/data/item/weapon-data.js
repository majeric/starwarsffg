import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";
import { basic } from "../shared/item-basic.js";
import { hardpoints } from "../shared/item-hardpoints.js";
import { equippable } from "../shared/item-equippable.js";
import { itemAttachments } from "../shared/item-attachments.js";
import { qualities } from "../shared/item-qualities.js";

function numericStat() {
  const { SchemaField, NumberField } = foundry.data.fields;
  const num = () => new NumberField({ initial: 0 });
  return new SchemaField({ value: num(), adjusted: num() });
}

function valueString(initial = "") {
  const { SchemaField, StringField } = foundry.data.fields;
  return new SchemaField({ value: new StringField({ initial }) });
}

function rangeField() {
  const { SchemaField, StringField } = foundry.data.fields;
  return new SchemaField({
    value: new StringField({ initial: "Short" }),
    adjusted: new StringField({ initial: "Short" }),
    label: new StringField({ initial: "Range" }),
  });
}

function ammoField() {
  const { SchemaField, NumberField } = foundry.data.fields;
  const num = () => new NumberField({ initial: 0 });
  return new SchemaField({ max: num(), value: num() });
}

/**
 * DataModel for the `weapon` item type. Modifier and attachment arrays remain
 * free-form for Phase 7; adjusted combat stats remain persisted for Phase 5.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class WeaponData extends BaseItemData {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      ...hardpoints(),
      ...equippable(),
      ...itemAttachments(),
      ...qualities(),
      skill: valueString("Ranged: Light"),
      characteristic: valueString(),
      damage: numericStat(),
      crit: numericStat(),
      range: rangeField(),
      special: valueString(),
      ammo: ammoField(),
    };
  }
}
