import { DicePoolFFG } from "../dice-pool-ffg.js";
import DiceHelpers from "../helpers/dice-helpers.js";

/**
 * Register the renderChatInput hook. Extracted from swffg-main.js by
 * Phase 3.3. Adds the FFG chat dice-roller button next to the roll
 * privacy controls when the chat input renders.
 */
export function registerRenderChatInputHook() {
  Hooks.on("renderChatInput", (app, _html, _data) => {
    if (app.id !== "chat") return;
    const rollButtonId = "ffgChatRoll";
    if (document.querySelector(`#${rollButtonId}`)) return;

    const rollButton = document.createElement("button");
    rollButton.id = rollButtonId;
    rollButton.type = "button";
    rollButton.classList.add("ui-control", "icon", "fa-light", "fa-dice-d20");

    const rollPrivacyElement = document.querySelector("#roll-privacy");
    rollPrivacyElement.appendChild(rollButton);

    rollButton.onclick = async function () {
      const dicePool = new DicePoolFFG();
      const user = { data: game.user.system };
      await DiceHelpers.displayRollDialog(
        user,
        dicePool,
        game.i18n.localize("SWFFG.RollingDefaultTitle"),
        "",
      );
    };
  });
}
