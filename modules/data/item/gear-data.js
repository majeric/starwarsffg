import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";
import { basic } from "../shared/item-basic.js";
import { itemAttachments } from "../shared/item-attachments.js";
import { qualities } from "../shared/item-qualities.js";

/**
 * DataModel for the `gear` item type. Gear composes the shared core, basic,
 * item attachment, and quality fragments.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class GearData extends BaseItemData {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      ...itemAttachments(),
      ...qualities(),
    };
  }
}
