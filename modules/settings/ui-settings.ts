type SettingViewData = Record<string, any>;

function getSettingValue(namespace: string, key: string): any {
  // FIXME(types): Settings form rows carry runtime namespace/key strings.
  return game.settings.get(namespace as any, key as any);
}

class ffgSettings extends FormApplication {
  activateListeners(html: any): void {
    super.activateListeners(html);
    html.find("button.filepicker").click(this._onFilePicker.bind(this));
  }

  getData(acceptableSettings: any = []): any {
    const canConfigure = game.user.can("SETTINGS_MODIFY");
    const includeSettings: SettingViewData[] = [];
    const acceptableSettingNames = acceptableSettings as string[];
    for (const [settingKey, settingConfig] of game.settings.settings) {
      if (acceptableSettingNames.includes(settingKey)) {
        const s = foundry.utils.duplicate(settingConfig) as SettingViewData;
        s.name = game.i18n.localize(s.name);
        s.hint = game.i18n.localize(s.hint);
        s.value = getSettingValue(s.namespace, s.key);
        s.type = settingConfig.type instanceof Function ? settingConfig.type.name : "String";
        s.isCheckbox = settingConfig.type === Boolean;
        s.isSelect = s.choices !== undefined;
        s.isRange = settingConfig.type === Number && s.range;
        s.isFilePicker = (settingConfig as SettingViewData).valueType === "FilePicker";
        includeSettings.push(s);
      }
    }

    const data = {
      system: {title: game.system.title, menus: [], settings: includeSettings},
    };

    // Return data
    return {
      user: game.user,
      canConfigure: canConfigure,
      systemTitle: game.system.title,
      data: data,
    };
  }

  _onFilePicker(event: Event): Promise<unknown> {
    event.preventDefault();

    const fp = new foundry.applications.apps.FilePicker({
      type: "image",
      callback: (path: string) => {
        $(event.currentTarget).prev().val(path);
        //this._onSubmit(event);
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
      // FIXME(types): Foundry V13 still accepts top/left here, but
      // fvtt-types only exposes the newer position option shape.
    } as any);
    return fp.browse();
  }

    /** @override */
  async _updateObject(event: Event, formData: Record<string, any>): Promise<void> {
    void event;
    for (const [k, v] of Object.entries(foundry.utils.flattenObject(formData))) {
      const s = game.settings.settings.get(k as any) as SettingViewData;
      const current = getSettingValue(s.namespace, s.key);
      if (v !== current) {
        await game.settings.set(s.namespace as any, s.key as any, v);
      }
    }
  }
}

export class rulesetSettings extends ffgSettings {
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ruleset-settings",
      classes: ["starwarsffg", "ruleset-settings"],
      title: `${game.i18n.localize("SWFFG.Settings.ruleset.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(): any {
    const includeSettingsNames = [
        "starwarsffg.dicetheme",
        "starwarsffg.vehicleRangeBand",
        "starwarsffg.skilltheme",
        "starwarsffg.enableForceDie",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class uiSettings extends ffgSettings {
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ui-settings",
      classes: ["starwarsffg", "ui-settings"],
      title: `${game.i18n.localize("SWFFG.Settings.ui.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(): any {
    const includeSettingsNames = [
      "starwarsffg.ui-uitheme",
      "starwarsffg.ui-pausedImage",
      "starwarsffg.ui-token-healthy",
      "starwarsffg.ui-token-wounded",
      "starwarsffg.ui-token-overwounded",
      "starwarsffg.ui-token-stamina-ok",
      "starwarsffg.ui-token-stamina-damaged",
      "starwarsffg.ui-token-stamina-over",
      "starwarsffg.displaySimulation",
      "starwarsffg.rollSimulation",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class combatSettings extends ffgSettings {
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "combat-settings",
      classes: ["starwarsffg", "combat-settings"],
      title: `${game.i18n.localize("SWFFG.Settings.combat.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(): any {
    const includeSettingsNames = [
      "starwarsffg.useGenericSlots",
      "starwarsffg.initiativeRule",
      "starwarsffg.removeCombatantAction",
      "starwarsffg.useDefense",
      "starwarsffg.additionalStatuses",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class actorSettings extends ffgSettings {
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "actor-settings",
      classes: ["starwarsffg", "actor-settings"],
      title: `${game.i18n.localize("SWFFG.Settings.actor.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(): any {
    const includeSettingsNames = [
      "starwarsffg.enableSoakCalc",
      "starwarsffg.talentSorting",
      "starwarsffg.showMinionCount",
      "starwarsffg.showAdversaryCount",
      "starwarsffg.adversaryItemName",
      "starwarsffg.maxAttribute",
      "starwarsffg.maxSkill",
      "starwarsffg.medItemName",
      "starwarsffg.HealingItemAction",
      "starwarsffg.consumeHealingItem",
      "starwarsffg.RivalTokenPrepend",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class xpSpendingSettings extends ffgSettings {
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "xpSpending",
      classes: ["starwarsffg", "xpSpending"],
      title: `${game.i18n.localize("SWFFG.Settings.xpSpending.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(): any {
    const includeSettingsNames = [
      "starwarsffg.specializationCompendiums",
      "starwarsffg.signatureAbilityCompendiums",
      "starwarsffg.forcePowerCompendiums",
      "starwarsffg.talentCompendiums",
      "starwarsffg.backgroundCompendiums",
      "starwarsffg.obligationCompendiums",
      "starwarsffg.speciesCompendiums",
      "starwarsffg.careerCompendiums",
      "starwarsffg.motivationCompendiums",
      "starwarsffg.itemCompendiums",
      "starwarsffg.notifyOnXpSpend",
      "starwarsffg.defaultObligation",
      "starwarsffg.defaultDuty",
      "starwarsffg.defaultMorality",
      "starwarsffg.maxRarity",
      "starwarsffg.allowRestricted",
      "starwarsffg.defaultCredits",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class localizationSettings extends ffgSettings {
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "localization",
      classes: ["starwarsffg", "localization"],
      title: `${game.i18n.localize("SWFFG.Settings.localization.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(): any {
    const includeSettingsNames = [
      "starwarsffg.skillSorting",
      "starwarsffg.destiny-pool-light",
      "starwarsffg.destiny-pool-dark",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class groupManagerSettings extends ffgSettings {
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "group-manager",
      classes: ["starwarsffg", "group-manager"],
      title: `${game.i18n.localize("SWFFG.Settings.groupManager.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(): any {
    const includeSettingsNames = [
      "starwarsffg.pcListMode",
      "starwarsffg.privateTriggers",
      "starwarsffg.GMCharactersInGroupManager"
    ];
    return super.getData(includeSettingsNames);
  }
}
