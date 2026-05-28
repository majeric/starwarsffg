# Phase 04 — Prototype Patch Cleanup

## Goal

Eliminate all `*.prototype.* = ...` assignments to Foundry classes. Replace
with proper subclass + `CONFIG.<X>.documentClass` / `CONFIG.<X>.objectClass`
registration.

## Why this phase

Prototype monkey-patching is the single biggest source of Foundry-version
breakage. Every minor Foundry release is a risk because internal behavior
of patched methods can change. The patches in scope:

1. `foundry.canvas.placeables.Token.prototype._drawBar` at `swffg-main.js:168`
2. `CONFIG.Dice.rolls[0]` reassignment at `swffg-main.js:112-113`
   (technically not a prototype patch but the same category: replacing
   Foundry's default class via array mutation)

## Phase preconditions

- [ ] Phase 0, Phase 3 complete (Phase 3 isolates hooks so we know what's left)
- [ ] `npm run verify` is green
- [ ] `modules/tokens/token-ffg.js` exists (current TokenFFG)

## Phase postconditions

- [ ] No `.prototype.` assignments anywhere in `modules/`
- [ ] `_drawBar` lives as a method on `TokenFFG extends foundry.canvas.placeables.Token`
- [ ] `RollFFG` registration uses the proper Foundry API
      (either `CONFIG.Dice.rolls.unshift(RollFFG)` if supported, or a
      documented helper, OR if the current pattern is genuinely required,
      it's wrapped in a registration helper with a comment explaining why)
- [ ] Token rendering behavior is identical (visual diff acceptable only
      if explicitly approved)
- [ ] `npm run verify` is green
- [ ] Manual smoke: open a world, observe wound/strain/hullTrauma bars
      render exactly as before
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")

## Files to be created

```
modules/tokens/token-ffg.js                  (already exists; extend it)
modules/dice/roll-registration.js            (NEW: helper for CONFIG.Dice.rolls)
```

## Files to be modified

- `modules/swffg-main.js` — remove prototype patch and direct CONFIG.Dice.rolls
  manipulation; replace with calls to subclass / helper

## Investigation notes

Before implementing, confirm in Foundry V13 docs whether:
- `CONFIG.Dice.rolls.unshift(RollFFG)` is supported and equivalent
- There's a recommended API for registering a custom Roll as the default
- `foundry.canvas.placeables.Token` is the correct base class in V13
  (it has been `Token` and `TokenLayer` historically; V13 may have moved it)

If a documented API doesn't exist for the dice case, this becomes an ADR:
"We retain the array-index-0 assignment because no better option exists in
Foundry V13. The assignment is now centralized in
`modules/dice/roll-registration.js` with a comment linking to this ADR."

## Anti-creep notes

- **Do not** "improve" the `_drawBar` implementation while moving it. Copy
  the function verbatim into the method body. Visual changes are a separate
  concern.
- **Do not** rewrite RollFFG. Just clean up how it's registered.
- **Do not** add new dice types or change existing ones.
