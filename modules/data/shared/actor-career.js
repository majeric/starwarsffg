/**
 * Schema fragment for the actor `career` reference (the template.json "career"
 * template) — the career name. Used by character.
 *
 * @returns {Record<string, object>} partial schema declaring `career`
 */
export function careerField() {
  const { SchemaField, StringField } = foundry.data.fields;
  return {
    career: new SchemaField({
      value: new StringField(),
    }),
  };
}
