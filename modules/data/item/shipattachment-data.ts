import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";
import { basic } from "../shared/item-basic.js";
import { hardpoints } from "../shared/item-hardpoints.js";
import { equippable } from "../shared/item-equippable.js";
import { itemAttachments } from "../shared/item-attachments.js";
import { qualities } from "../shared/item-qualities.js";

/**
 * DataModel for the `shipattachment` item type. Modifier and attachment arrays
 * stay free-form until the Phase 7 Active Effect migration.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class ShipAttachmentData extends BaseItemData {
  static defineSchema(): foundry.data.fields.DataSchema {
    const { StringField } = foundry.data.fields;
    return {
      ...core(),
      ...basic(),
      ...hardpoints(),
      ...equippable(),
      ...itemAttachments(),
      ...qualities(),
      label: new StringField({ initial: "Ship Attachment" }),
    };
  }
}
