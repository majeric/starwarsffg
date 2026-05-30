import { register_crew } from "../helpers/crew.js";

/**
 * Register the dropActorSheetData hook. Extracted from swffg-main.js by
 * Phase 3.7. Delegates drop-event handling to the crew helper so vehicle
 * actors can pick up dropped character actors as crew.
 */
export function registerDropActorSheetDataHook(): void {
  Hooks.on("dropActorSheetData", (...args: any[]) => {
    register_crew(...args);
  });
}
