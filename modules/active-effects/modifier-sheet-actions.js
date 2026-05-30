import { createModifierEffect, deleteModifierEffect } from "./modifier-ae-helpers.js";

export async function onClickAttributeControl(event) {
  if (this.actor && !this.actor.verifyEditModeIsNotEnabled()) return;

  event.preventDefault();
  const action = event.currentTarget.dataset.action;

  if (["forcepower", "signatureability", "specialization"].includes(this.object.type)) {
    await updateLegacyUpgradeAttribute.call(this, event, action);
  } else {
    await updateEffectAttribute.call(this, event, action);
  }
}

async function updateLegacyUpgradeAttribute(event, action) {
  const form = this.form;
  if (action === "create") {
    const key = new Date().getTime();
    const element = document.createElement("div");
    element.innerHTML = legacyAttributeMarkup(key);
    form.appendChild(element);
    await this._onSubmit(event);
  } else if (action === "delete") {
    const li = event.currentTarget.closest(".attribute");
    li.parentElement.removeChild(li);
    await this._onSubmit(event);
  }
}

function legacyAttributeMarkup(key) {
  const firstCharacteristic = Object.keys(CONFIG.FFG.characteristics)[0];
  return `<input type="text" name="data.attributes.attr${key}.key" value="attr${key}" style="display:none;"/><select class="attribute-modtype" name="data.attributes.attr${key}.modtype"><option value="Characteristic">Characteristic</option></select><select class="attribute-mod" name="data.attributes.attr${key}.mod"><option value="${firstCharacteristic}">${firstCharacteristic}</option></select><input class="attribute-value" type="text" name="data.attributes.attr${key}.value" value="0" data-dtype="Number" placeholder="0"/>`;
}

async function updateEffectAttribute(event, action) {
  if (action === "create") {
    CONFIG.logger.debug("Creating new modifier...");
    const defaultModtype = ["criticaldamage", "shipattachment", "shipweapon"].includes(this.object.type) ? "Vehicle Stat" : "Stat";
    const defaultMod = defaultModtype === "Vehicle Stat" ? "Armour" : "Wounds";
    await createModifierEffect(this.object, defaultModtype, defaultMod, 0);
  } else if (action === "delete") {
    const li = event.currentTarget.closest(".attribute");
    const effectId = li.dataset.attribute;
    if (effectId) await deleteModifierEffect(this.object, effectId);
  }
}
