export default class EffectHelpers {

  // Lookup mode name from int
  static MODES = Object.fromEntries(
    Object.entries(CONST.ACTIVE_EFFECT_MODES).map(
      ([key, value]) => [value, key])
    );

  // Map effects from EmbeddedCollection
  static transformEffects(originalEffect, _iterator, _effects) {
    let effect = structuredClone(originalEffect);

    // Copy properties we need from the prototype
    effect.id = originalEffect.id;
    effect.parentName = originalEffect.parent.name;
    effect.active = originalEffect.active;

    // Convert duration to string.
    // Read these off the source document rather than the clone: v14 serves several of them
    // through compatibility getters (and moved duration.combat onto ActiveEffect#start),
    // and structuredClone keeps only own data properties, so the clone loses them.
    const duration = originalEffect.duration ?? {};
    if (duration.combat ?? originalEffect.start?.combat) {
      effect.duration = game.i18n.localize("SWFFG.Effect.Duration.CurrentCombat");
    } else if (duration.seconds) {
      effect.duration = `${duration.seconds} ${game.i18n.localize("SWFFG.Effect.Duration.Seconds")}`;
    } else if (duration.rounds) {
      effect.duration = `${duration.rounds} ${game.i18n.localize("SWFFG.Effect.Duration.Rounds")}`;
    } else if (duration.turns) {
      effect.duration = `${duration.turns} ${game.i18n.localize("SWFFG.Effect.Duration.Turns")}`;
    } else {
      effect.duration = game.i18n.localize("SWFFG.Effect.Duration.Permanent");
    }

    // v14 moved ActiveEffect#changes to #system.changes. Same reason as above: take the
    // array from the document, not the clone, then copy each entry before rewriting it.
    const sourceChanges = originalEffect.system?.changes ?? originalEffect.changes ?? [];
    effect.changes = sourceChanges.map((change) => ({ ...change }));

    // Update each change from this effect
    effect.changes.forEach((change, index) => {
      // Convert mode to string. v14 replaced the numeric change.mode with a string change.type.
      change.mode = change.type ?? EffectHelpers.MODES[change.mode];

      // LStrip 'system.' for shorter keys
      if (change.key?.startsWith("system.")) {
        change.key = change.key.substring(7);
      }
    });

    return effect;
  }
}