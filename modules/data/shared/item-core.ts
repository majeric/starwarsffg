import { metaOnly } from "./actor-meta.js";

/**
 * Schema fragment for the shared item `core` template: description and
 * metadata. The legacy `attributes` field was removed in Phase 7 — modifiers
 * are now ActiveEffects.
 *
 * @returns {Record<string, object>} partial schema declaring core item fields
 */
export function core(): foundry.data.fields.DataSchema {
  return {
    description: new foundry.data.fields.HTMLField(),
    ...metaOnly(),
  };
}
