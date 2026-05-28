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

## Tasks (to be detailed before phase begins)

Suggested breakdown:
- Task 3.1: Create `modules/hooks/index.js` skeleton
- Tasks 3.2-3.N: One file per hook concern, extracted from `swffg-main.js`
- Task 3.N+1: Wire `swffg-main.js` to call `registerAllHooks()`
- Task 3.N+2: Verify Phase 3 stop gate

Discover the hook list by grepping `swffg-main.js` for `Hooks.on` and `Hooks.once`.
The number of files depends on how many distinct hook events are handled —
estimate 10-15 based on the current code.
