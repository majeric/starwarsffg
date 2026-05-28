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
- [ ] V13/V14 compatibility verified per ADR-008 (Token + Roll APIs are high-risk for cross-version drift; explicit attention required)

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

## Tasks

### 4.1 — Investigate Foundry V13 dice and token registration APIs

**No code changes.** Produce an ADR documenting:
- The current state of `CONFIG.Dice.rolls` in V13: is `unshift()` supported?
  Is there a documented "default Roll" registration helper?
- The current state of token placeable extension in V13: `CONFIG.Token.objectClass`
  is already the canonical pathway (see existing useGenericSlots branch in
  swffg-main.js where TokenFFG is registered).
- Whether `foundry.canvas.placeables.Token` is the correct V13 base class
  for the `_drawBar` override.

The ADR records the decisions that drive tasks 4.2 and 4.3. If no canonical
V13 API exists for dice, the ADR documents retaining the array-index-0
pattern centralized in a helper.

**Commit:** `phase 04.1: foundry v13 dice and token API investigation`

### 4.2 — Move Token._drawBar override into TokenFFG class

**Source:** `modules/swffg-main.js:168-` (the
`foundry.canvas.placeables.Token.prototype._drawBar` assignment, ~85 lines)
**Target:** `modules/tokens/token-ffg.js` — extend `TokenFFG` with a
`_drawBar(number, bar, data)` method containing the body of the current
prototype assignment.

**Steps:**
1. Add `_drawBar(number, bar, data) { ... }` to TokenFFG. Body verbatim
   from the prototype assignment.
2. Verify TokenFFG registration: currently `CONFIG.Token.objectClass = TokenFFG`
   happens inside `if (useGenericSlots)`. Confirm with the operator
   whether the override should apply when generic slots are disabled.
   If yes, move the registration outside the conditional.
3. Delete the prototype assignment from swffg-main.js.
4. Refactor `_drawBar` to satisfy complexity rules — extract helpers like
   `drawThresholdBar(bar, data, h)`, `drawDefaultBar(bar, data, h)`,
   `colorsForAttribute(attribute)`.
5. Lint, vitest, verify, manual smoke.

**Commit:** `phase 04.2: move token _drawBar into TokenFFG class`

### 4.3 — Clean up CONFIG.Dice.rolls registration

**Source:** `swffg-main.js:112-113`
```js
CONFIG.Dice.rolls.push(CONFIG.Dice.rolls[0]);
CONFIG.Dice.rolls[0] = RollFFG;
```

**Target:** `modules/dice/roll-registration.js` exporting `registerRollFFG()`.

**Steps:**
1. Based on the ADR from task 4.1, choose the canonical V13 API.
2. Create `modules/dice/roll-registration.js` with `registerRollFFG()`.
3. Replace the two-line mutation in swffg-main.js with a single
   `registerRollFFG()` call (and the import).

**Commit:** `phase 04.3: clean up CONFIG.Dice.rolls registration`

### 4.4 — Verify Phase 4 stop gate

**Steps:**
1. `grep -n "\.prototype\." modules/` — zero matches outside test files
   and lib/.
2. `grep -n "CONFIG.Dice.rolls\[0\]" modules/` — zero matches.
3. `npm run verify` — same green/lint pattern.
4. Manual smoke (operator): wound/strain bars render correctly;
   `new Roll("1+1")` returns a RollFFG instance.

**Commit:** `phase 04.4: phase 4 stop gate verified`
