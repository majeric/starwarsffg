# Restructure runbook

You are about to work on the Star Wars FFG system restructure. **Read this entire
file before doing anything else.**

## What this is

A multi-phase architectural refactor of the Star Wars FFG Foundry VTT system,
executed by AI sessions. Each session follows the same protocol so that any
session, starting cold with no prior context, can pick up exactly where the last
one stopped.

The plan is split across files in this directory:

- `STATE.md` — the single source of truth for current progress. **Read first, update last.**
- `PRINCIPLES.md` — non-negotiable rules every session must follow
- `SESSION_PROTOCOL.md` — the exact ritual: how to start, how to work, how to stop
- `VERIFICATION.md` — what "done" means and how to check
- `architecture/current-state.md` — the analysis that motivated the restructure
- `architecture/target-state.md` — what we are building toward
- `architecture/decision-log.md` — major decisions already made; do not relitigate
- `phases/phase-NN-name.md` — the actual work, broken into atomic tasks

## Your first 5 commands every session

```
1. cat docs/restructure/STATE.md
2. cat docs/restructure/PRINCIPLES.md
3. cat docs/restructure/SESSION_PROTOCOL.md
4. cat docs/restructure/phases/<current-phase-from-STATE.md>
5. npm run verify
```

If step 5 fails, document the failure in `STATE.md` under "Open issues" before
changing anything else. Then work the failure as part of the current session
until it is resolved or until it genuinely requires human input or external
state you cannot provide. Do not skip to unrelated work.

## Your last 3 commands every session

```
1. Update STATE.md (mark tasks complete, note blockers and their resolution)
2. git status   (must show only files you touched per the current task)
3. Append a session log to .restructure/sessions/<UTC-timestamp>.md
```

## What you must not do

See `PRINCIPLES.md` for the full list. The headline rules:

- Do not work outside the scope of the current task in `STATE.md`
- Do not skip `npm run verify`. Do not use `--no-verify` or equivalent
- Do not introduce new dependencies without an ADR in `decision-log.md`
- Do not modify already-shipped migrations
- Do not relitigate decisions already in `decision-log.md`

## If you find a problem outside the current task's scope

Write it under "Open issues" in `STATE.md`. Do not fix it. A future task or
session will address it.

## Scope of this runbook

This runbook covers the restructure work only. Normal feature development and
bug fixes against the upstream system continue in parallel and are not governed
by this protocol.

## Runbook permanence

This runbook is permanent documentation, not refactor scaffolding. After the
restructure completes, it serves as the architecture reference for future
contributors. ADRs continue to be added for new decisions. PRINCIPLES.md
continues to govern contribution style. STATE.md continues to track ongoing
architectural work even after Phase 12 closes.

Do not delete `docs/restructure/` when the restructure is "done." It is how
the codebase explains itself.
