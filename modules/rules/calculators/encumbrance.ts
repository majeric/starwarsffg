interface EncumbranceItem {
  type: string;
  system?: {
    encumbrance?: { value?: number; adjusted?: number };
    equippable?: { equipped?: boolean };
    quantity?: { value?: number };
  };
}

interface EncumbranceFields {
  value?: number;
  adjusted?: number;
}

/**
 * Compute total encumbrance points used by an actor's items.
 *
 * Mirrors the legacy logic in modules/actors/actor-ffg.js:613-647. Equipped
 * armour subtracts 3 from its adjusted encumbrance (floored at 0). Other
 * armour, weapon, and shipweapon items use adjusted-or-value times quantity.
 * All other items use value times quantity. Items without an encumbrance
 * field are skipped. Items with falsy quantity contribute 0 — a quirk
 * preserved from the legacy code; changing it is a future ADR.
 */
export function computeEncumbrance(items: EncumbranceItem[]): number {
  let total = 0;
  for (const item of items) {
    try {
      total += contributionFromItem(item);
    } catch {
      // Per source: per-item access failures must not crash the total.
    }
  }
  return total;
}

function contributionFromItem(item: EncumbranceItem): number {
  const enc = item?.system?.encumbrance;
  if (!hasEncumbrance(enc)) return 0;
  if (isEquippedArmour(item)) return equippedArmourPoints(enc);
  return unequippedItemPoints(item, enc);
}

function hasEncumbrance(enc: EncumbranceFields | undefined): enc is EncumbranceFields {
  if (!enc) return false;
  return enc.adjusted !== undefined || enc.value !== undefined;
}

function isEquippedArmour(item: EncumbranceItem): boolean {
  if (item.type !== "armour") return false;
  return item?.system?.equippable?.equipped === true;
}

function equippedArmourPoints(enc: EncumbranceFields): number {
  const points = Number(enc.adjusted) - 3;
  return points > 0 ? points : 0;
}

function unequippedItemPoints(item: EncumbranceItem, enc: EncumbranceFields): number {
  const quantity = item?.system?.quantity?.value || 0;
  if (isHeldGearType(item.type)) {
    const points = enc.adjusted !== undefined ? enc.adjusted : enc.value;
    return (points ?? 0) * quantity;
  }
  return (enc.value ?? 0) * quantity;
}

function isHeldGearType(type: string): boolean {
  return type === "armour" || type === "weapon" || type === "shipweapon";
}
