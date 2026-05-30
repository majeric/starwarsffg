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
import { computeEncumbrance } from "../../rules/calculators/encumbrance";

type ActorDerivedData = {
  stats?: {
    encumbrance?: { value: number };
  };
};

type ActorDataModelParent = Actor.Implementation & {
  derived: ActorDerivedData;
};

type ActorDataModelBase = {
  stats?: {
    encumbrance?: unknown;
  };
};

export class BaseActorData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.DataSchema,
  ActorDataModelParent,
  ActorDataModelBase
> {
  static defineSchema(): foundry.data.fields.DataSchema {
    return {};
  }

  /**
   * Reset the derived namespace on the parent actor before each prepare cycle.
   * Per-type `prepareDerivedData()` overrides populate `this.parent.derived.*`
   * (ADR-011); any per-type `prepareBaseData` override must call `super`.
   */
  prepareBaseData() {
    this.parent.derived = {};
  }

  /**
   * Phase 6 (relaxed per ADR-013): compute the AE-independent derived values
   * into `this.parent.derived`. Currently the encumbrance total (sum of item
   * encumbrance, via the Phase 1 calculator). AE-dependent stat totals
   * (wounds/strain/soak/defence/forcePool) stay in `system.*` until Phase 7
   * owns the Active Effects change-mode rework.
   */
  prepareDerivedData() {
    if (!this.stats?.encumbrance) return;
    this.parent.derived.stats ??= {};
    this.parent.derived.stats.encumbrance = {
      value: computeEncumbrance(Array.from(this.parent.items ?? [])),
    };
  }
}
