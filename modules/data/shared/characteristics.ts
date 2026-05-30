/** Characteristic key -> [display label, abbreviation], from template.json. */
const CHARACTERISTICS = {
  Brawn: ["Brawn", "Br"],
  Agility: ["Agility", "Ag"],
  Intellect: ["Intellect", "Int"],
  Cunning: ["Cunning", "Cun"],
  Willpower: ["Willpower", "Will"],
  Presence: ["Presence", "Pr"],
};

/**
 * Schema fragment for the six actor `characteristics` (the template.json
 * "characteristics" template). `label`/`abrev` are kept because the sheet and
 * the legacy `_prepareSharedData` localisation read them (they are data, not
 * the redundant type-hint keys ADR-010 drops).
 *
 * @returns {Record<string, object>} partial schema declaring `characteristics`
 */
export function characteristicsSchema(): foundry.data.fields.DataSchema {
  const { SchemaField, NumberField, StringField } = foundry.data.fields;
  const characteristics = {};
  for (const [key, [label, abrev]] of Object.entries(CHARACTERISTICS)) {
    characteristics[key] = new SchemaField({
      value: new NumberField({ initial: 0 }),
      label: new StringField({ initial: label }),
      abrev: new StringField({ initial: abrev }),
    });
  }
  return { characteristics: new SchemaField(characteristics) };
}
