/**
 * Schema fragment for items that can be equipped.
 *
 * @returns {Record<string, object>} partial schema declaring `equippable`
 */
export function equippable() {
  const { SchemaField, BooleanField } = foundry.data.fields;
  return {
    equippable: new SchemaField({
      value: new BooleanField({ initial: true }),
      equipped: new BooleanField({ initial: false }),
    }),
  };
}
