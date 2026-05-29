/**
 * Schema fragment for the actor `species` reference (the template.json
 * "species" template) — the species name. Used by character, rival and nemesis.
 *
 * @returns {Record<string, object>} partial schema declaring `species`
 */
export function speciesField() {
  const { SchemaField, StringField } = foundry.data.fields;
  return {
    species: new SchemaField({
      value: new StringField(),
    }),
  };
}
