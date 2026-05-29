/**
 * Schema fragment for the legacy item modifier arrays. The misspelled
 * `adjusteditemmodifer` key is persisted data and must be preserved as-is.
 *
 * @returns {Record<string, object>} partial schema declaring quality arrays
 */
export function qualities() {
  const { ArrayField, ObjectField } = foundry.data.fields;
  return {
    itemmodifier: new ArrayField(new ObjectField()),
    adjusteditemmodifer: new ArrayField(new ObjectField()),
  };
}
