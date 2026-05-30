/**
 * Schema fragment for the actor `general` block (the template.json "general"
 * template) — the rich-text "features" notes shown on humanoid sheets. The
 * runtime-only `enrichedFeatures`/`enrichedNotes` values the sheet builds are
 * not persisted and are not declared here.
 *
 * @returns {Record<string, object>} partial schema declaring `general`
 */
export function general(): foundry.data.fields.DataSchema {
  const { SchemaField, HTMLField } = foundry.data.fields;
  return {
    general: new SchemaField({
      features: new HTMLField(),
    }),
  };
}
