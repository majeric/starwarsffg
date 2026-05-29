# Session Protocol

This is the exact ritual every session follows. Do not skip steps.

---

## Session start

```
1. Read docs/restructure/README.md           (re-orientation; cheap)
2. Read docs/restructure/STATE.md            (where am I?)
3. Read docs/restructure/PRINCIPLES.md       (rules)
4. Read docs/restructure/architecture/decision-log.md   (decisions already made)
5. Read docs/restructure/phases/<current-phase>.md      (the work)
6. Locate the current task block in the phase file (matches STATE.md "Current task")
7. Run `git status`. If dirty, document the pre-existing state and reconcile it
   before touching overlapping files.
8. Run `npm run verify`. If it fails, document the failure and work through it
   before starting the task's implementation.
9. Update STATE.md: change "Current task" status indicator if you use one,
   note session start in the session log.
```

If steps 7 or 8 surface a blocker, do not skip to unrelated work. Document the
failure in `STATE.md` "Open issues", then resolve it in the current session if
it can be resolved locally. Stop only when the blocker requires human input or
external state you cannot provide.

---

## Work loop (one iteration per task)

```
For each task in the current phase, in order:

  a. Read the task block in the phase file (preconditions, steps, verification, anti-creep notes)
  b. Verify task preconditions one by one. Each precondition has a check command.
     If any precondition fails, document it in "Open issues", then work through
     it if doing so stays inside the current task scope.
  c. Make exactly the changes the task specifies. Nothing else.
  d. Run the task-specific verification commands listed in the task block.
     If they fail, fix and re-run. Do not proceed until green.
  e. Run `npm run verify` (the full gate).
     If it fails, fix and re-run. Do not proceed until green.
  f. Update STATE.md:
       - check off the task box
       - update "Last verified" timestamp
       - update "Current task" to the next task
  g. Commit:
       git add <files specified in the task>
       git commit -m "phase NN.MM: <task title>"
     (Use the exact title from STATE.md. No extra files. No co-author lines
      unless explicitly told.)
  h. Update "Last commit on plan" in STATE.md to the new short SHA.

  Continue to the next task ONLY IF:
   - The phase file explicitly groups the next task with this one ("tasks N.X and N.Y
     are sequential and may be done in one session"), OR
   - You have explicit instruction from the human operator to continue
  Otherwise, end the session.
```

---

## Session end

```
1. Confirm STATE.md reflects reality
     - Any task you started but did not complete must be either:
         (a) rolled back (git checkout -- <files>; uncheck task in STATE.md), OR
         (b) committed in a known-good state with a note in "Open issues" about
             what remains. Prefer (a).
2. Run `git status`
     - Should show only files you intentionally touched, all committed.
3. Append a session log entry to .restructure/sessions/<UTC-timestamp>.md
     Use the template at the end of this file.
4. Stop.
```

---

## Handling blockers

A blocker is anything that prevents you from completing the current task as
written. Examples:

- A precondition fails and can't be satisfied by your task
- `npm run verify` fails for reasons outside the current task's scope
- The task description seems wrong (conflicts with PRINCIPLES.md, references
  a file that doesn't exist, etc.)
- An external dependency (Foundry API, library) behaves differently than the
  task assumes

**What to do when blocked:**

```
1. Do NOT improvise a workaround outside the current task's scope.
2. Do NOT skip to a different task.
3. Document the blocker in STATE.md "Open issues" with:
     - Date (UTC)
     - Phase and task
     - What you tried
     - What failed
     - Your best guess at the cause
4. Work through the blocker directly if it can be solved locally while obeying
   the current task scope and PRINCIPLES.md.
5. Update the Open issue with the resolution once fixed, including any command
   that proved the fix.
6. Stop only if the blocker requires human input or external state you cannot
   provide. If you partially made changes and cannot finish, leave the worktree
   in a known-good state and document exactly what remains.
```

A human or a future session should only be needed when the blocker cannot be
resolved locally.

---

## Session log entry template

Path: `.restructure/sessions/<YYYY-MM-DDTHH-MM-SSZ>.md`

```markdown
# Session: 2026-05-27T14:15:00Z

**Model:** <model identifier if known, otherwise "unknown">
**Phase:** phase-NN-name
**Started at task:** N.M
**Ended at task:** N.M (completed) | N.M (blocked) | N.M (in-progress, rolled back)

## Tasks completed this session
- N.M — <title>
- N.M — <title>

## Commits made
- <short-sha> — phase NN.MM: <title>
- <short-sha> — phase NN.MM: <title>

## Issues encountered
(none) | <description>

## Notes for the next session
(none) | <free-form notes; do not put rules here, those go in PRINCIPLES.md
or decision-log.md after human review>
```

---

## What this protocol prevents

- Drift: every session ends in a known-good state
- Lost work: STATE.md is always accurate; the next session knows exactly what to do
- Quiet breakage: `npm run verify` catches regressions before they compound
- Scope creep: per-task commits make accidental wide-scope changes visible immediately
- Hallucinated progress: the verification gate is the source of truth for "done", not the AI's confidence
