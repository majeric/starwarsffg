/**
 * Schema fragment for the shared item `basic` template. The adjusted fields are
 * still persisted for Phase 5 compatibility; Phase 6 moves derived values out
 * of the stored schema.
 *
 * @returns {Record<string, object>} partial schema declaring basic item fields
 */
export function basic() {
  const { SchemaField, NumberField } = foundry.data.fields;
  const num = (initial = 0) => new NumberField({ initial });
  const adjustedNumber = () => new SchemaField({ value: num(), adjusted: num() });
  return {
    quantity: new SchemaField({ value: num(1) }),
    encumbrance: adjustedNumber(),
    price: adjustedNumber(),
    rarity: adjustedNumber(),
  };
}
