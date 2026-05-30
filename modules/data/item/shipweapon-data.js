import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";
import { basic } from "../shared/item-basic.js";
import { hardpoints } from "../shared/item-hardpoints.js";
import { equippable } from "../shared/item-equippable.js";
import { itemAttachments } from "../shared/item-attachments.js";
import { qualities } from "../shared/item-qualities.js";

function numericStat() {
  const { SchemaField, NumberField } = foundry.data.fields;
  const num = () => new NumberField({ initial: 0, nullable: true });
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

function firingArc() {
  const { SchemaField, BooleanField } = foundry.data.fields;
  return new SchemaField({
    fore: new BooleanField({ initial: false }),
    aft: new BooleanField({ initial: false }),
    port: new BooleanField({ initial: false }),
    starboard: new BooleanField({ initial: false }),
    dorsal: new BooleanField({ initial: false }),
    ventral: new BooleanField({ initial: false }),
  });
}

/**
 * DataModel for the `shipweapon` item type. Modifier and attachment arrays
 * remain free-form for Phase 7; adjusted combat stats remain persisted here.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class ShipWeaponData extends BaseItemData {
  static defineSchema() {
    const { StringField } = foundry.data.fields;
    return {
      ...core(),
      ...basic(),
      ...hardpoints(),
      ...equippable(),
      ...itemAttachments(),
      ...qualities(),
      label: new StringField({ initial: "Ship Weapon" }),
      skill: valueString("Gunnery"),
      firingarc: firingArc(),
      damage: numericStat(),
      crit: numericStat(),
      range: rangeField(),
      special: valueString(),
    };
  }
}
