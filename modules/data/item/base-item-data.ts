/**
 * Base TypeDataModel for item types in the FFG system. Per-type
 * subclasses extend this and define their full schema in
 * `static defineSchema()`. See modules/data/actor/base-actor-data.js
 * for the broader contract documentation.
 */
export class BaseItemData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.DataSchema,
  Item.Implementation
> {
  static defineSchema(): foundry.data.fields.DataSchema {
    return {};
  }
}
