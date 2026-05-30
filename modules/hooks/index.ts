import { registerSetupHook } from "./setup.js";
import { registerRenderChatInputHook } from "./render-chat-input.js";
import { registerRenderActorDirectoryHook } from "./render-actor-directory.js";
import { registerRenderCompendiumDirectoryHook } from "./render-compendium-directory.js";
import { registerRenderChatMessageHook } from "./render-chat-message.js";
import { registerDropActorSheetDataHook } from "./drop-actor-sheet-data.js";
import { registerRenderGamePauseHook } from "./render-game-pause.js";

/**
 * Central entry point for Foundry hook registrations extracted out of
 * swffg-main.js by Phase 3 of the restructure.
 *
 * Per Phase 3 scope, this only extracts top-level hook registrations.
 * Hooks registered inside the init or ready hook bodies (createActor,
 * updateToken, hotbarDrop, etc.) stay where they are — they reference
 * variables scoped to their containing hook and can't be cleanly extracted
 * without first decomposing those bodies.
 *
 * Each register* function is imported from its per-event file and called
 * here once. The whole chain runs once at module load.
 */
export function registerAllHooks(): void {
  registerSetupHook();
  registerRenderChatInputHook();
  registerRenderActorDirectoryHook();
  registerRenderCompendiumDirectoryHook();
  registerRenderChatMessageHook();
  registerDropActorSheetDataHook();
  registerRenderGamePauseHook();
}
