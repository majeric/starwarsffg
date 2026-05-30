/**
 * Schema fragment for `metadata` (tags + sources), used by actor types that
 * include the template.json "meta_only" template. Both lists hold strings:
 * tags are lowercased category names, sources are book/page references.
 *
 * @returns {Record<string, object>} partial schema declaring `metadata`
 */
export function metaOnly(): foundry.data.fields.DataSchema {
  const { SchemaField, ArrayField, StringField } = foundry.data.fields;
  return {
    metadata: new SchemaField({
      tags: new ArrayField(new StringField()),
      sources: new ArrayField(new StringField()),
    }),
  };
}
