/**
 * Base TypeDataModel for actor types in the FFG system. Per-type
 * subclasses extend this and define their full schema in
 * `static defineSchema()`. The base provides shared utilities and the
 * documentation contract that all per-type models follow.
 *
 * Per Phase 5 (DataModel migration), each actor type subclass is
 * registered via `CONFIG.Actor.dataModels.<type> = SubclassData`. Once
 * a type is registered, Foundry uses the subclass schema instead of the
 * type's template.json block.
 *
 * Subclasses must:
 *  - Override `static defineSchema()` to return a `foundry.data.fields.SchemaField`
 *    body matching the type's current template.json shape.
 *  - Override `prepareBaseData()` and `prepareDerivedData()` as needed.
 *    Derived values should write to `this.parent.derived.*` (Phase 6
 *    enforces this contract) rather than mutating `this.parent.system.*`.
 *  - Delegate computation to Phase 1 calculators (modules/rules/calculators/)
 *    where applicable.
 */
export class BaseActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {};
  }
}
