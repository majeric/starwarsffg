import DataImporter from "../importer/data-importer.js";
import SWAImporter from "../importer/swa-importer.js";

/**
 * Register the renderCompendiumDirectory hook. Extracted from swffg-main.js
 * by Phase 3.5. Adds GM-only "Importers" buttons to the compendium
 * directory footer that launch the OggDude and Adversaries dataset
 * importers.
 */
export function registerRenderCompendiumDirectoryHook(): void {
  Hooks.on("renderCompendiumDirectory", (_app: unknown, html: HTMLElement) => {
    if (!game.user.isGM) return;

    const div = document.createElement("div");
    div.className = "og-character-import";
    div.innerHTML = `<hr><h4>Importers</h4>
    <button class="og-character" style="width:100%;margin-bottom:4px;">OggDude Dataset Importer</button>
    <button class="swa-character" style="width:100%;">Adversaries Dataset Importer</button>`;
    html.querySelector(".directory-footer")?.appendChild(div);

    div.querySelector(".og-character")?.addEventListener("click", (event) => {
      event.preventDefault();
      // FIXME(types): DataImporter constructor typed by ApplicationV2 mixin
      new (DataImporter as any)().render(true);
    });
    div.querySelector(".swa-character")?.addEventListener("click", (event) => {
      event.preventDefault();
      new SWAImporter().render(true);
    });
  });
}
