/**
 * Register the renderGamePause hook. Extracted from swffg-main.js by
 * Phase 3.9. Replaces the paused-game overlay image with the operator's
 * configured `ui-pausedImage` when set.
 */
export function registerRenderGamePauseHook() {
  Hooks.on("renderGamePause", (_application, element) => {
    const pausedImage = game.settings.get("starwarsffg", "ui-pausedImage");
    if (pausedImage) {
      element.querySelector("img").src = pausedImage;
    }
  });
}
