/**
 * Schema fragment for item hard points. The adjusted value is still persisted
 * for Phase 5 compatibility; Phase 6/7 can move derived attachment math later.
 *
 * @returns {Record<string, object>} partial schema declaring `hardpoints`
 */
export function hardpoints(): foundry.data.fields.DataSchema {
  const { SchemaField, NumberField } = foundry.data.fields;
  const num = () => new NumberField({ initial: 0 });
  return {
    hardpoints: new SchemaField({
      value: num(),
      adjusted: num(),
    }),
  };
}
