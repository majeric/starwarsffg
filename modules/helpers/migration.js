/**
 * Migrate any formdata from "data" to "system" since Foundry was doing this prior to v12
 * @param updateData
 * @returns {*}
 */
export function migrateDataToSystem(updateData) {
  if (!updateData || typeof updateData !== 'object') {
    return updateData;
  }
  if (Object.keys(updateData).includes('data')) {
    if (Object.keys(updateData).includes('system')) {
      updateData.system = foundry.utils.mergeObject(
          updateData.system,
          updateData.data,
      );
    } else {
      updateData.system = updateData.data;
    }
    delete updateData.data;
  }
  for (const curKey of Object.keys(updateData)) {
    // Only the leading segment is the legacy "data" prefix. Matching anywhere also
    // rewrote keys that merely contain it, such as "metadata.source".
    if (curKey.startsWith('data.')) {
      updateData[`system.${curKey.slice('data.'.length)}`] = updateData[curKey];
      delete updateData[curKey];
    }
  }
  return updateData;
}
