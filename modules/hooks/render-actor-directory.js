import { CharacterCreator } from "../helpers/character-creator.js";

/**
 * Register the renderActorDirectory hook. Extracted from swffg-main.js
 * by Phase 3.4. Adds an "Activate Character Wizard" button to the actor
 * directory's header actions when the actors directory renders.
 */
export function registerRenderActorDirectoryHook() {
  Hooks.on("renderActorDirectory", (app, html) => {
    if (app.id !== "actors") return;
    const wizardId = "ffgCharacterWizard";
    if (document.querySelector(`#${wizardId}`)) return;

    const wizardButtonIcon = document.createElement("i");
    wizardButtonIcon.classList.add("fa-solid", "fa-wand-magic-sparkles");

    const wizardButtonText = document.createElement("span");
    wizardButtonText.textContent = game.i18n.localize("SWFFG.CharacterCreator.Entry.Button");

    const wizardButton = document.createElement("button");
    wizardButton.id = wizardId;
    wizardButton.type = "button";
    wizardButton.classList.add("activate-wizard");
    wizardButton.appendChild(wizardButtonIcon);
    wizardButton.appendChild(wizardButtonText);

    const folderElement = html.querySelector(".header-actions.action-buttons");
    folderElement.appendChild(wizardButton);

    wizardButton.onclick = async function () {
      ui.notifications.info(game.i18n.localize("SWFFG.CharacterCreator.Entry.Loading"));
      const create = new CharacterCreator();
      create.render(true);
    };
  });
}
