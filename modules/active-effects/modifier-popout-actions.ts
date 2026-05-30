import PopoutModifiers from "../popout-modifiers.js";

export async function popoutModiferWindow(this: any, event: Event): Promise<void> {
  event.preventDefault();

  const title = `${game.i18n!.localize("SWFFG.TabModifiers")}: ${this.object.name}`;

  new PopoutModifiers(this.object, {
    title,
  }).render(true);
}

export async function popoutModiferWindowUpgrade(this: any, event: Event): Promise<void> {
  event.preventDefault();
  const keyname = (event.currentTarget as HTMLElement).parentElement!.dataset.itemid;

  const title = `${game.i18n!.localize("SWFFG.TabModifiers")}: ${this.object.system.upgrades[keyname!].name}`;

  const data = {
    parent: this.object,
    keyname,
    data: {
      data: {
        ...this.object.system.upgrades[keyname!],
      },
    },
    isUpgrade: true,
  };

  new PopoutModifiers(data, {
    title,
  }).render(true);
}
