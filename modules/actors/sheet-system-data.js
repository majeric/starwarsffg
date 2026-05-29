function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }

  return value;
}

function toPlainObject(value) {
  if (!value) return {};
  if (typeof value.toObject === "function") {
    return cloneValue(value.toObject(false));
  }
  return cloneValue(value);
}

function mergeDeep(base, override) {
  const merged = cloneValue(base);
  for (const [key, value] of Object.entries(override)) {
    if (isObject(merged[key]) && isObject(value)) {
      merged[key] = mergeDeep(merged[key], value);
      continue;
    }

    merged[key] = cloneValue(value);
  }
  return merged;
}

/**
 * Build the system data object passed to legacy actor sheets.
 *
 * Foundry DataModels can make `actor.toObject(false).system` omit defaulted
 * schema fields and undeclared transient fields that legacy preparation writes
 * onto `actor.system` for rendering. Start from the serialized source shape so
 * free-form legacy keys survive, then overlay the prepared DataModel state so
 * defaults and derived render fields are present.
 *
 * @param {object} actorData serialized actor data from `actor.toObject(false)`
 * @param {object} preparedSystem live `actor.system` object
 * @returns {object} system data for sheet rendering
 */
export function buildActorSheetSystemData(actorData, preparedSystem) {
  const sourceSystem = toPlainObject(actorData?.system);
  const preparedData = toPlainObject(preparedSystem);
  const systemData = mergeDeep(sourceSystem, preparedData);

  if (preparedSystem?.skilltypes) {
    systemData.skilltypes = preparedSystem.skilltypes;
  }
  if (preparedSystem?.effects) {
    systemData.effects = preparedSystem.effects;
  }

  return systemData;
}
