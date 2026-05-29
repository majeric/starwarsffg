import { BaseItemData } from "./base-item-data.js";
import { metaOnly } from "../shared/actor-meta.js";

/**
 * DataModel for the `homesteadupgrade` item type. This is the only item type
 * whose template composes only `meta_only`; it intentionally has no core item
 * description or attributes block.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class HomesteadUpgradeData extends BaseItemData {
  static defineSchema() {
    return {
      ...metaOnly(),
    };
  }
}
