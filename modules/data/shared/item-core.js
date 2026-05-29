import { metaOnly } from "./actor-meta.js";
import { attributesField } from "./attributes.js";

/**
 * Schema fragment for the shared item `core` template: description,
 * free-form legacy attributes, and metadata.
 *
 * @returns {Record<string, object>} partial schema declaring core item fields
 */
export function core() {
  return {
    description: new foundry.data.fields.HTMLField(),
    ...attributesField(),
    ...metaOnly(),
  };
}
