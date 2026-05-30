/**
 * Schema fragment for the actor `stats` block (the template.json "stats"
 * template). `character`/`nemesis`/`minion` include `strain`; `rival` inlines a
 * stats block without it, so the `strain` flag controls whether it is declared.
 *
 * Every `adjusted` subfield is a derived value scheduled to move to the derived
 * namespace in Phase 6; it stays in the persisted schema for now (ADR-002).
 *
 * @param {{ strain?: boolean }} [options]
 * @returns {Record<string, object>} partial schema declaring `stats`
 */
export function statsSchema({ strain = true }: { strain?: boolean } = {}): foundry.data.fields.DataSchema {
  const { SchemaField, NumberField } = foundry.data.fields;
  const num = (initial = 0) => new NumberField({ initial });
  const stats: foundry.data.fields.DataSchema = {
    wounds: new SchemaField({ value: num(), min: num(), max: num(), adjusted: num() }),
    soak: new SchemaField({ value: num(), adjusted: num() }),
    defence: new SchemaField({ ranged: num(), melee: num(), adjusted: num() }),
    encumbrance: new SchemaField({ value: num(), max: num(), adjusted: num() }),
    forcePool: new SchemaField({ value: num(), max: num(), adjusted: num() }),
    credits: new SchemaField({ value: num(), adjusted: num() }),
  };
  if (strain) {
    stats.strain = new SchemaField({ value: num(), min: num(), max: num(), adjusted: num() });
  }
  return { stats: new SchemaField(stats) };
}
