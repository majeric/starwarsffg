import PopoutEditor from "../popout-editor.js";
import { DicePoolFFG } from "../dice-pool-ffg.js";
import DiceHelpers from "../helpers/dice-helpers.js";
import { itemPillHover } from "../swffg-main.js";

/**
 * Register the renderChatMessage hook. Extracted from swffg-main.js by
 * Phase 3.6. Rewrites dice glyph placeholders in chat messages into the
 * styled spans the dice font expects, wires the "send pool to player"
 * button, and toggles the collapsible item-card details / hover-tooltip
 * pills.
 */
export function registerRenderChatMessageHook(): void {
  Hooks.on("renderChatMessage", (_app, html: JQuery, messageData: any) => {
    void renderChatMessage(html, messageData);
  });
}

async function renderChatMessage(html: JQuery, messageData: any): Promise<void> {
  const content = html.find(".message-content");
  content[0].innerHTML = await PopoutEditor.renderDiceImages(content[0].innerHTML, undefined);

  html.on("click", ".ffg-pool-to-player", () => {
    const poolData = (messageData.message.flags as any).starwarsffg;
    const dicePool = new DicePoolFFG(poolData.dicePool);
    DiceHelpers.displayRollDialog(
      poolData.roll.data,
      dicePool,
      poolData.description,
      poolData.roll.skillName,
      poolData.roll.item,
      poolData.roll.flavor,
      poolData.roll.sound,
    );
  });

  html.find(".starwarsffg.item-card .summary").on("click", async (event) => {
    event.preventDefault();
    const li = $(event.currentTarget);
    const details = li.parent().children(".collapsible-content");
    const collapseButton = li.children(".collapse-toggle");
    if (li.hasClass("expanded")) {
      details.slideUp(200, () => details.hide());
    } else {
      details.show();
      details.slideDown(200);
    }
    li.toggleClass("expanded");
    collapseButton.toggleClass("fa-chevron-down");
    collapseButton.toggleClass("fa-chevron-left");
  });

  html
    .find(".starwarsffg.item-card .item-pill, .starwarsffg .specials .hover-tooltip")
    .on("mouseover", (event) => {
      itemPillHover(event);
    });
}
