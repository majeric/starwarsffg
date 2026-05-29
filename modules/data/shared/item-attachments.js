/**
 * Schema fragment for the legacy embedded item attachment array. Phase 7
 * migrates attachment effects to Active Effects; until then entries stay
 * free-form so existing embedded data round-trips unchanged.
 *
 * @returns {Record<string, object>} partial schema declaring `itemattachment`
 */
export function itemAttachments() {
  const { ArrayField, ObjectField } = foundry.data.fields;
  return {
    itemattachment: new ArrayField(new ObjectField()),
  };
}
