import { MonteCarlo } from "../../lib/@swrpg-online/monte-carlo/dist/index.esm.js";

// FIXME(types): FormApplication is a Foundry global not typed in strict mode
export default class RollBuilderFFG extends (FormApplication as any) {
  roll: any;
  dicePool: any;
  description: string;

  constructor(rollData: any, rollDicePool: any, rollDescription: string, rollSkillName: string, rollItem: any, rollAdditionalFlavor: string, rollSound: string) {
    super();
    this.roll = {
      data: rollData,
      skillName: rollSkillName,
      item: rollItem,
      sound: rollSound,
      flavor: rollAdditionalFlavor,
    };
    this.dicePool = rollDicePool;
    this.description = rollDescription;
  }

  /** @override */
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "roll-builder",
      classes: ["starwarsffg", "roll-builder-dialog"],
      template: "systems/starwarsffg/templates/dice/roll-options-ffg.html",
      width: 350
    });
  }

  /** @override */
  get title(): string {
    return this.description || game.i18n.localize("SWFFG.RollingDefaultTitle");
  }

  /** @override */
  // eslint-disable-next-line max-lines-per-function, complexity -- pre-existing legacy method
  async getData(): Promise<any> {
    //get all possible sounds
    let sounds: any[] = [];
    const diceSymbols = {
      advantage: await foundry.applications.ux.TextEditor.enrichHTML("[AD]"),
      success: await foundry.applications.ux.TextEditor.enrichHTML("[SU]"),
      threat: await foundry.applications.ux.TextEditor.enrichHTML("[TH]"),
      failure: await foundry.applications.ux.TextEditor.enrichHTML("[FA]"),
      upgrade: await foundry.applications.ux.TextEditor.enrichHTML("[PR]"),
      triumph: await foundry.applications.ux.TextEditor.enrichHTML("[TR]"),
      despair: await foundry.applications.ux.TextEditor.enrichHTML("[DE]"),
      light: await foundry.applications.ux.TextEditor.enrichHTML("[LI]"),
      dark: await foundry.applications.ux.TextEditor.enrichHTML("[DA]"),
    };

    let canUserAddAudio: any = await game.settings.get("starwarsffg", "allowUsersAddRollAudio");
    let canUserAddFlavor = game.user!.isGM || !this?.roll?.flavor;

    if (game.user!.isGM) {
      (game as any).playlists.contents.forEach((playlist: any) => {
        playlist.sounds.forEach((sound: any) => {
          let selected = false;
          const s = this.roll?.sound ?? this.roll?.item?.flags?.starwarsffg?.ffgsound;
          if (s === sound.path) {
            selected = true;
          }
          sounds.push({ name: sound.name, path: sound.path, selected });
        });
      });
    } else if (canUserAddAudio) {
      const playlistId = await game.settings.get("starwarsffg", "allowUsersAddRollAudioPlaylist");
      const playlist = await (game as any).playlists.get(playlistId);

      if (playlist) {
        playlist.sounds.forEach((sound: any) => {
          let selected = false;
          const s = this.roll?.sound ?? this.roll?.item?.flags?.starwarsffg?.ffgsound;
          if (s === sound.path) {
            selected = true;
          }
          sounds.push({ name: sound.name, path: sound.path, selected });
        });
      } else {
        CONFIG.logger.warn(`Playlist for players does not exist, disabling audio`);
        canUserAddAudio = false;
      }
    }

    let users: any[] = [{ name: "Send To All", id: "all" }];
    if (game.user!.isGM) {
      game.users!.contents.forEach((user: any) => {
        if (user.visible && user.id !== game.user!.id) {
          users.push({ name: user.name, id: user.id });
        }
      });
    }

    const enableForceDie = game.settings.get("starwarsffg", "enableForceDie");
    const labels = {
      light: game.settings.get("starwarsffg", "destiny-pool-light"),
      dark: game.settings.get("starwarsffg", "destiny-pool-dark"),
    };

    let display = false;
    const displaySimulation = game.settings.get("starwarsffg", "displaySimulation") as unknown as string;
    if (displaySimulation === "GM" && game.user!.isGM || displaySimulation === "All") {
      display = true;
    }

    return {
      sounds,
      isGM: game.user!.isGM,
      canUserAddAudio,
      flavor: this.roll.flavor,
      users,
      enableForceDie,
      labels,
      diceSymbols,
      simDisplay: display,
      simCount: game.settings.get("starwarsffg", "rollSimulation")
    };
  }

  /** @override */
  // eslint-disable-next-line max-lines-per-function, complexity -- pre-existing legacy method
  activateListeners(html: any): void {
    super.activateListeners(html);

    this._initializeInputs(html);
    this._activateInputs(html);

    html.find(".btn").click(async (event: any) => {
      // if sound was not passed search for sound dropdown value
      if (!this.roll.sound) {
        const sound = html.find(".sound-selection")?.[0]?.value;
        if (sound) {
          this.roll.sound = sound;
          if (this?.roll?.item) {
            let entity: any;
            let entityData: any;
            if (!this?.roll?.item?.flags?.starwarsffg?.uuid) {
              entity = game.actors!.get(this.roll.data.actor._id);
              entityData = {
                _id: this.roll.item.id,
              };
            } else {
              const parts = this.roll.item.flags.starwarsffg?.uuid.split(".");
              const [sceneName, sceneId, entityName, entityId, embeddedName, embeddedId] = parts;
              entity = (game as any).actors.tokens[entityId].items.get(embeddedId);
              if (parts.length === 6) {
                entityData = {
                  _id: entity.id,
                };
              }
            }
            (foundry.utils as any).setProperty(entityData, "flags.starwarsffg.ffgsound", sound);
            entity.update(entityData);
          }
        }
      }

      if (!this.roll.flavor) {
        const flavor = html.find(".flavor-text")?.[0]?.value;
        if (flavor) {
          this.roll.flavor = flavor;
        }
      }

      // validate that required data is present
      if (this.roll.item?.uuid && !this.roll.item.flags?.starwarsffg?.uuid) {
        // uuid flag is missing, look up the item and set it, so it's fixed going forward
        const tmp_item = await (foundry.utils as any).fromUuid(this.roll.item.uuid);
        await tmp_item.setFlag("starwarsffg", "uuid", this.roll.item.uuid);
      }


      try {
        // remove one-time status effects
        CONFIG.logger.debug("Removing one-time status effects from actor");
        const actorData = this.roll.data.document;
        if (actorData) {
          if (actorData) {
            const actorEffects = actorData.getEmbeddedCollection("ActiveEffect");
            if (actorEffects) {
              const toDelete: string[] = [];
              for (const activeEffect of actorEffects.contents) {
                if ((activeEffect as any)?.system?.duration === "once") {
                  toDelete.push((activeEffect as any)._id);
                }
              }
              if (toDelete.length > 0) {
                await actorData.deleteEmbeddedDocuments("ActiveEffect", toDelete);
              }
            }
          }
        }
      } catch (error) {
        CONFIG.logger.warn(`Caught error in roller: ${error}`);
      }

      try {
        if (this?.roll?.item && this.roll.item.type === "weapon") {
          const item: any = await foundry.utils.fromUuid(this.roll.item.uuid);
          if (item) {
            const ammoEnabled = item.getFlag("starwarsffg", "config.enableAmmo");
            if (ammoEnabled) {
              await item.update({"system.ammo.value": item.system.ammo.value - 1});
            }
          }
        }
      } catch (error) {
        CONFIG.logger.warn(`Caught ammo error in roller: ${error}`);
      }

      const sentToPlayer = html.find(".user-selection")?.[0]?.value;
      if (sentToPlayer) {
        let container = $(`<div class='dice-pool'></div>`)[0];
        this.dicePool.renderAdvancedPreview(container);

        const messageText = `<div>
          <div>${game.i18n.localize("SWFFG.SentDicePoolRollHint")}</div>
          ${$(container).html()}
          <button class="ffg-pool-to-player">${game.i18n.localize("SWFFG.SentDicePoolRoll")}</button>
        </div>`;

        let chatOptions: any = {
          user: game.user!.id,
          content: messageText,
          flags: {
            starwarsffg: {
              roll: this.roll,
              dicePool: this.dicePool,
              description: this.description,
            },
          },
        };

        if (sentToPlayer !== "all") {
          chatOptions.whisper = [sentToPlayer];
        }

        ChatMessage.create(chatOptions);
      } else {
        if (this.roll.crew) {
          this.roll.item['crew'] = this.roll.crew
        }
        const roll = new game.ffg.RollFFG(this.dicePool.renderDiceExpression(), this.roll.item, this.dicePool, this.roll.flavor);
        // check if this is a crew roll - and it's a roll for a weapon
        if (this.roll.item && this.roll.item.hasOwnProperty('crew') && Object.keys(this.roll.item).length > 1) {
          await this.roll.item.update({"flags": {"starwarsffg": {"crew": this.roll.item.crew}}})
        }
        await roll.toMessage({
          user: game.user!.id,
          speaker: {
            actor: game.actors!.get(this.roll.data?.actor?._id),
            alias: this.roll.data?.token?.name,
            token: this.roll.data?.token?._id,
          },
          flavor: `${game.i18n.localize("SWFFG.Rolling")} ${game.i18n.localize(this.roll.skillName)}...`,
        });
        if (this.roll?.sound) {
          foundry.audio.AudioHelper.play({ src: this.roll.sound } as any, true);
        }

        return roll;
      }
    });

    html.find(".extend-button").on("click", (event: any) => {
      event.preventDefault();
      event.stopPropagation();

      $(event.currentTarget).toggleClass("minimize");

      const selector = $(event.currentTarget).next();
      $(selector).toggleClass("hide");
      $(selector).toggleClass("maximize");

      if (!$(event.currentTarget).hasClass("minimize")) {
        $(selector).val("");
      }
    });
  }

  _updatePreview(html: any): void {
    const poolDiv = html.find(".dice-pool-dialog .dice-pool")[0];
    poolDiv.innerHTML = "";
    this.dicePool.renderPreview(poolDiv);
    this._updateSimulationPreview();
  }

  _initializeInputs(html: any): void {
    html.find(".pool-value input").each((key: number, value: any) => {
      const name = $(value).attr("name") as string;
      value.value = this.dicePool[name];
    });

    html.find(".pool-additional input").each((key: number, value: any) => {
      const name = $(value).attr("name") as string;
      value.value = this.dicePool[name];
      $(value).attr("allowNegative", "true");
    });

    this._updatePreview(html);
  }

  // eslint-disable-next-line max-lines-per-function -- pre-existing legacy method
  _activateInputs(html: any): void {
    html.find(".upgrade-buttons button").on("click", (event: any) => {
      event.preventDefault();
      event.stopPropagation();

      const id = $(event.currentTarget).attr("id") as string;

      switch (id.toLowerCase()) {
        case "upgrade-ability": {
          this.dicePool.upgrade(1);
          break;
        }
        case "downgrade-ability": {
          this.dicePool.upgrade(-1);
          break;
        }
        case "upgrade-difficulty": {
          this.dicePool.upgradeDifficulty(1);
          break;
        }
        case "downgrade-difficulty": {
          this.dicePool.upgradeDifficulty(-1);
          break;
        }
      }
      this._initializeInputs(html);
    });

    html.find(".pool-container, .pool-additional").on("click", (event: any) => {
      let input: any;

      if ($(event.currentTarget).hasClass(".pool-container")) {
        input = $(event.currentTarget).find(".pool-value input")[0];
      } else {
        input = $(event.currentTarget).find("input")[0];
        if(!input) {
          input = $(event.currentTarget.nextElementSibling).find("input")[0];
        }
      }

      input.value++;
      this.dicePool[input.name] = parseInt(input.value);
      this._updatePreview(html);
    });

    html.find(".pool-container, .pool-additional").on("contextmenu", (event: any) => {
      let input: any;

      if ($(event.currentTarget).hasClass(".pool-container")) {
        input = $(event.currentTarget).find(".pool-value input")[0];
      } else {
        input = $(event.currentTarget).find("input")[0];
        if(!input) {
          input = $(event.currentTarget.nextElementSibling).find("input")[0];
        }
      }

      const allowNegative = $(input).attr("allowNegative");

      if (input.value > 0 || allowNegative) {
        input.value--;
        this.dicePool[input.name] = parseInt(input.value);
      }
      this._updatePreview(html);
    });
  }

  _updateObject(): void {}

  _updateSimulationPreview(): void {
    try {
      const simPool = new (MonteCarlo as any)({
        dicePool: {
          abilityDice: this.dicePool.ability,
          difficultyDice: this.dicePool.difficulty,
          proficiencyDice: this.dicePool.proficiency,
          challengeDice: this.dicePool.challenge,
          boostDice: this.dicePool.boost,
          setbackDice: this.dicePool.setback,
        },
        iterations: game.settings.get("starwarsffg", "rollSimulation"),
        runSimulate: false,
        modifiers: {
          automaticSuccesses: this.dicePool.success,
          automaticFailures: this.dicePool.failure,
          automaticAdvantages: this.dicePool.advantage,
          automaticThreats: this.dicePool.threat,
          automaticTriumphs: this.dicePool.triumph,
          automaticDespairs: this.dicePool.despair,
        },
      });
      const simResults = simPool.simulate();

      let newClass = "";
      if (simResults.successProbability < .25) {
        newClass = "unlikely";
      } else if (simResults.successProbability > .75) {
        newClass = "likely";
      }

      $("#success_chance").text(
        `${(simResults.successProbability * 100).toLocaleString(undefined, {maximumFractionDigits: 0})}%`
      ).removeClass("likely unlikely").addClass(newClass);
    } catch (e) {

    }
  }
}
