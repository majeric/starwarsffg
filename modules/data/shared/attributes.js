/**
 * Schema fragment for the free-form `attributes` object that stores the legacy
 * bespoke modifier entries (the template.json "attributes" template). Phase 7
 * (ADR-004) migrates these entries to ActiveEffects; until then the field stays
 * untyped so existing data round-trips unchanged.
 *
 * @returns {Record<string, object>} partial schema declaring `attributes`
 */
export function attributesField() {
  return {
    attributes: new foundry.data.fields.ObjectField(),
  };
}
