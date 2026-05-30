/**
 * Schema fragment for the actor `specialisation` reference (the template.json
 * "specialisation" template): the active specialisation name plus a list of the
 * character's specialisation names. Used by character.
 *
 * @returns {Record<string, object>} partial schema declaring `specialisation`
 */
export function specialisationField(): foundry.data.fields.DataSchema {
  const { SchemaField, StringField, ArrayField } = foundry.data.fields;
  return {
    specialisation: new SchemaField({
      value: new StringField(),
      list: new ArrayField(new StringField()),
    }),
  };
}
