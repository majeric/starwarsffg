import PopoutModifiers from "../popout-modifiers.js";

export async function popoutModiferWindow(event) {
  event.preventDefault();

  const title = `${game.i18n.localize("SWFFG.TabModifiers")}: ${this.object.name}`;

  new PopoutModifiers(this.object, {
    title,
  }).render(true);
}

export async function popoutModiferWindowUpgrade(event) {
  event.preventDefault();
  const keyname = event.currentTarget.parentElement.dataset.itemid;

  const title = `${game.i18n.localize("SWFFG.TabModifiers")}: ${this.object.system.upgrades[keyname].name}`;

  const data = {
    parent: this.object,
    keyname,
    data: {
      data: {
        ...this.object.system.upgrades[keyname],
      },
    },
    isUpgrade: true,
  };

  new PopoutModifiers(data, {
    title,
  }).render(true);
}
