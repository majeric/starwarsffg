# Phase 03 — Hook Handler Decomposition

## Goal

Move all `Hooks.on(...)` / `Hooks.once(...)` handlers out of
`modules/swffg-main.js` into `modules/hooks/`. `swffg-main.js` becomes
a ~150-line coordinator.

## Why this phase

After Phase 2, the only remaining content in `swffg-main.js` is class
registration, prototype patches, and hook callbacks. Splitting hooks out
isolates each concern into its own file, making the init sequence linear and
auditable.

## Phase preconditions

- [ ] Phase 0, Phase 2 complete (Phase 1 may or may not be done — independent)
- [ ] `npm run verify` is green
- [ ] `modules/hooks/` does not exist

## Phase postconditions

- [ ] `modules/hooks/index.js` exports `registerAllHooks()`
- [ ] Each hook callback lives in its own file under `modules/hooks/`
- [ ] `modules/swffg-main.js` is < 200 lines and contains no inline
      `Hooks.on()` or `Hooks.once()` calls (apart from imports / `registerAllHooks()`)
- [ ] All hooks still fire and behave identically
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")
- [ ] V13/V14 compatibility verified per ADR-008 (audit new code against API differences; full certification deferred to Phase 13)

## Suggested file layout

```
modules/hooks/
├── index.js                       ← registerAllHooks(): calls each registerX() below
├── init.js                        ← Hooks.once("init")
├── setup.js                       ← Hooks.on("setup")
├── ready.js                       ← Hooks.once("ready")
├── canvas-ready.js                ← Hooks.on("canvasReady")
├── render-chat-message.js
├── render-actor-sheet.js
├── render-item-sheet.js
├── render-combat-tracker.js
├── update-combat.js
├── create-actor.js
├── create-item.js
└── ...
```

Each file exports a single `registerXxxHooks()` function. `index.js`
imports them all and calls them in order from `registerAllHooks()`.

## Anti-creep notes

- **Do not** restructure what the hooks do. Move only.
- **Do not** combine related hooks into one file unless they share state.
  Per-event files are easier to reason about.
- **Do** preserve init order. Hooks registered in `Hooks.once("init")` must
  still register before `Hooks.on("setup")` runs. The order of
  `registerInitHooks()` vs `registerSetupHooks()` calls in `index.js`
  doesn't actually matter (since Foundry fires hooks by event, not
  registration order), but follow the file naming order to keep it readable.

## Tasks

**Scoped narrowly:** Phase 3 extracts only the *top-level* `Hooks.on(...)`
and `Hooks.once(...)` registrations from `swffg-main.js`. Hooks registered
*inside* the init hook body (createActor, updateToken, preCreateCombatant,
preDeleteCombatant) or *inside* the ready hook body (hotbarDrop,
createMacro, closeItemSheetFFG, createItem, deleteItem, refreshToken,
updateActiveEffect) stay where they are — they reference variables and
callbacks scoped to their containing hook. A follow-up phase (Phase 3.5
or part of Phase 5) will decompose the init/ready bodies further.

Per-task pattern: create `modules/hooks/<event-name>.js` exporting
`registerXxxHook()`, which contains the original `Hooks.on(...)` call
verbatim with any imports it needs. Wire from `modules/hooks/index.js`'s
`registerAllHooks()`. Delete the inline registration from swffg-main.js.

### 3.1 — Scaffold modules/hooks/index.js

**Status:** Complete — commit `b494e12`

Create `modules/hooks/index.js` with `export function registerAllHooks()`
that is initially a no-op (matches the index.js pattern from Phase 2).
Wire `swffg-main.js` to call `registerAllHooks()` once near the top of
the init hook (after `registerAllSettings()`). Each subsequent task adds
its import + call to `index.js`.

**Commit:** `phase 03.1: scaffold modules/hooks/index.js`

### 3.2 — Extract setup hook

**Status:** Complete — commit `e39a636`

**Source:** `swffg-main.js:72-75` (Hooks.on("setup") that registers journal
enrichers and system tours).

**Files to create:** `modules/hooks/setup.js`

The body imports `register_roll_tag_enricher`, `register_oggdude_tag_enricher`,
`register_dice_enricher` from `../helpers/journal.js` and
`register_system_tours` from `../helpers/tours.js`. Move those imports too.

**Commit:** `phase 03.2: extract setup hook`

### 3.3 — Extract renderChatInput hook

**Status:** Complete — commits `7f0196a` + `2b3219f` (fix for unused-args warning)

**Source:** `swffg-main.js:703-` (registers click handlers for chat input).

**Files to create:** `modules/hooks/render-chat-input.js`

Carefully audit what helpers and imports the body needs; move them along.

**Commit:** `phase 03.3: extract renderChatInput hook`

### 3.4 — Extract renderActorDirectory hook

**Status:** Complete — commit `dc5598e` (batched with 3.5-3.7 and 3.9; protocol deviation documented in STATE.md)

**Source:** `swffg-main.js:728-`

**Files to create:** `modules/hooks/render-actor-directory.js`

**Commit:** `phase 03.4: extract renderActorDirectory hook`

### 3.5 — Extract renderCompendiumDirectory hook

**Status:** Complete — commit `dc5598e` (batched)

**Source:** `swffg-main.js:757-`

**Files to create:** `modules/hooks/render-compendium-directory.js`

**Commit:** `phase 03.5: extract renderCompendiumDirectory hook`

### 3.6 — Extract renderChatMessage hook

**Status:** Complete — commit `dc5598e` (batched; imports itemPillHover from swffg-main.js — circular but safe since referenced lazily inside the hook callback)

**Source:** `swffg-main.js:780-`

**Files to create:** `modules/hooks/render-chat-message.js`

This hook is asynchronous; preserve the async signature.

**Commit:** `phase 03.6: extract renderChatMessage hook`

### 3.7 — Extract dropActorSheetData hook

**Status:** Complete — commit `dc5598e` (batched)

**Source:** `swffg-main.js:817-`

**Files to create:** `modules/hooks/drop-actor-sheet-data.js`

**Commit:** `phase 03.7: extract dropActorSheetData hook`

### 3.8 — Extract diceSoNiceReady hook

**Status:** Deferred — see STATE.md "Open issues". The hook's 221-line callback contains many dice-preset definitions that exceed the 50-line per-function maintainability rule. Extracting cleanly requires splitting by dice theme (swffg, genesys) into multiple helper functions inside the hook file.

**Source:** `swffg-main.js:1354-`

**Files to create:** `modules/hooks/dice-so-nice-ready.js`

This is `Hooks.once`, not `Hooks.on`. Hook fires once when the Dice So Nice
module is ready (it's an optional dependency). Preserve the `once`
semantics in the extracted file.

**Commit:** `phase 03.8: extract diceSoNiceReady hook`

### 3.9 — Extract renderGamePause hook

**Status:** Complete — commit `dc5598e` (batched)

**Source:** `swffg-main.js:1576-`

**Files to create:** `modules/hooks/render-game-pause.js`

**Commit:** `phase 03.9: extract renderGamePause hook`

### 3.10 — Verify Phase 3 stop gate

**Status:** Complete (partial close; 3.8 deferred) — commit `eb79caf`

**Steps:**
1. `grep -n "^Hooks\." modules/swffg-main.js` returns only the init and
   ready registrations (init line 80, ready line ~826)
2. `npm run verify` — same green/lint pattern
3. All hooks still fire and behave identically (manual smoke deferred to
   operator)
4. Future-maintainer check: pick `modules/hooks/render-chat-message.js`;
   could a contributor add a new behavior to chat message rendering by
   reading only that file plus 1-2 helpers? Yes.

**Commit:** `phase 03.10: phase 3 stop gate verified`

---

## Out of scope for Phase 3 (open issues at close)

- Decomposing the `Hooks.once("init", ...)` body itself — currently ~700 lines
  of class registration, prototype patches, dice setup, etc. Some of this
  naturally moves out in Phase 4 (prototype cleanup), Phase 5 (DataModels),
  and as Phase 2 follow-ups (consolidating remaining settings files).
- Decomposing the `Hooks.once("ready", ...)` body — also large, contains
  multiple inline `Hooks.on(...)` for events like hotbarDrop, createItem,
  etc. These reference ready-scoped state and can't be cleanly extracted
  without first refactoring the ready body.
- Top-level hooks registered inside the init body (createActor, updateToken,
  preCreateCombatant, preDeleteCombatant) — same scope rationale.
