/**
 * Test harness for DataModel derived computation (Phase 6 / ADR-011).
 *
 * The ADR-010 field mock only introspects a schema; derived tests need the
 * prepare lifecycle to actually run. This instantiates the model from source
 * data, attaches a minimal parent document, runs `prepareBaseData()` then
 * `prepareDerivedData()`, and returns the parent stub so `parent.derived` can
 * be asserted. `parentExtras` supplies fields a type's derivation reads off the
 * document (e.g. `items`, `type`, `flags`).
 *
 * @param {Function} ModelClass a TypeDataModel subclass
 * @param {object} [source] source system data (becomes the model's fields)
 * @param {object} [parentExtras] extra parent-document fields
 * @returns {object} the parent document stub, with `derived` populated
 */
export function prepareDerived(ModelClass, source = {}, parentExtras = {}) {
  const model = new ModelClass(source);
  const parent = { system: model, ...parentExtras };
  model.parent = parent;
  model.prepareBaseData?.();
  model.prepareDerivedData?.();
  return parent;
}
