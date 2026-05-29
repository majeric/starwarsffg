/**
 * Schema fragment for the shared actor `biography` rich-text field
 * (the template.json "biography" template). Spread into a type's
 * `static defineSchema()` return value.
 *
 * @returns {Record<string, object>} partial schema declaring `biography`
 */
export function biography() {
  return {
    biography: new foundry.data.fields.HTMLField(),
  };
}
