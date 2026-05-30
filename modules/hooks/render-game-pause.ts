/**
 * Register the renderGamePause hook. Extracted from swffg-main.js by
 * Phase 3.9. Replaces the paused-game overlay image with the operator's
 * configured `ui-pausedImage` when set.
 */
export function registerRenderGamePauseHook(): void {
  Hooks.on("renderGamePause", (_application: unknown, element: HTMLElement) => {
    const pausedImage = game.settings!.get("starwarsffg", "ui-pausedImage") as unknown as string;
    if (pausedImage) {
      element.querySelector("img")!.src = pausedImage;
    }
  });
}
