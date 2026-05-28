# Phase 00 — Foundation: tooling and test resurrection

## Goal

Establish the build, test, lint, and verification infrastructure that every
subsequent phase depends on. No runtime behavior changes in this phase —
existing system code keeps working exactly as it did.

## Why this phase first

You cannot safely refactor without:
- A way to verify the system still loads (`build`, `smoke load`)
- A way to verify code is correct (`vitest`)
- A way to detect regressions (`typecheck`, `lint`)
- A way to verify migrations don't break worlds (`migration replay`)

Every subsequent phase assumes these gates exist and runs `npm run verify`
after every task. Phase 0 is what makes that possible.

## Phase preconditions

- [ ] `STATE.md` shows phase-00-foundation as current
- [ ] Repository is clean (`git status` empty)
- [ ] Node.js >= 20.x is available (verify with `node --version`)
- [ ] ADR-005 (fork system id) has been resolved in `architecture/decision-log.md`

## Phase postconditions (stop gate)

- [ ] `npm install` runs cleanly
- [ ] `npm run verify` runs all 6 gates end-to-end
  - Some gates may have known failures documented in `VERIFICATION.md`;
    that's acceptable for Phase 0 exit, but the verify command itself must
    run to completion and report each gate's pass/fail
- [ ] Foundry V13 loads the system from `npm run build` output
- [ ] CI is wired to run `npm run verify` on PR
- [ ] All phase tasks are checked off in `STATE.md`

---

## Tasks

### 0.1 — Create package.json with build/test dependencies

**Status:** Complete — commit `dc0acd3`

**Preconditions:**
- [ ] No `package.json` exists at repo root (check with `ls package.json`).
      If one exists, STOP and document — its contents must be reconciled.

**Files to create:**
- `package.json`

**Content requirements:**

```json
{
  "name": "starwarsffg",
  "version": "2.0.3-fork.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "verify": "node scripts/verify.mjs",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "typescript": "^5.5.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "@types/node": "^20.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

Per ADR-005 (accepted), the system id stays as `starwarsffg` — the fork is a
drop-in replacement for upstream. Use `"starwarsffg"` as `name` in package.json.
The version pin `2.0.3-fork.0` signals "started from upstream v2.0.3, fork
iteration 0"; the post-`fork.` integer increments per release of the fork.
The pre-release suffix also ensures upstream releases sort as "newer" if a
user's Foundry accidentally checks upstream's manifest URL — which is fine,
since they shouldn't.

**Steps:**
1. Create `package.json` with the content above
2. Run `npm install` — must succeed cleanly

**Verification:**
- [ ] `ls package.json` shows the file
- [ ] `ls node_modules` shows installed packages
- [ ] `npm run --silent build` errors only because vite.config.mjs is missing
      (acceptable — task 0.2 adds it)

**Do NOT in this task:**
- Add any dependencies beyond the list above
- Create vite.config, tsconfig, or any other config files (those are their own tasks)
- Touch `system.json`

**Commit:** `phase 00.1: create package.json with build/test dependencies`

---

### 0.2 — Add vite.config.mjs configured for Foundry ESM output

**Status:** Complete — commit `3f93c91`

**Preconditions:**
- [ ] Task 0.1 complete; `node_modules` populated

**Files to create:**
- `vite.config.mjs`

**Behavior the config must produce:**
- Output to `dist/` (or `build/` — pick one; document in the config comment)
- ES module format
- Source maps in dev, none in production
- Preserve module structure (no bundling of `modules/*` into one file —
  Foundry loads individual files per `system.json`'s `esmodules` array)
- Copy `system.json`, `template.json`, `lang/`, `templates/`, `styles/`,
  `images/`, `lib/` into the output as-is

**Reference:** there are community Foundry+Vite templates; do not invent
a configuration. Find a reference template, port its config, document the
source in a comment at the top of `vite.config.mjs`.

**Verification:**
- [ ] `npm run build` produces an output directory
- [ ] Output directory contains `system.json`, the `modules/` tree, and asset folders
- [ ] `npm run --silent verify` no longer fails on the build step due to missing config
      (it may fail later — typecheck, lint, etc. — those are subsequent tasks)

**Do NOT in this task:**
- Modify any existing source files in `modules/`
- Change `system.json` paths (the build output must match what `system.json` already references)

**Commit:** `phase 00.2: add vite build configuration`

---

### 0.3 — Add tsconfig.json with allowJs and permissive defaults

**Status:** Complete — commit `470e298`

**Preconditions:**
- [ ] Tasks 0.1, 0.2 complete

**Files to create:**
- `tsconfig.json`

**Content requirements:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node", "vite/client"]
  },
  "include": ["modules/**/*", "scripts/**/*", "tests/**/*", "types/**/*"],
  "exclude": ["node_modules", "lib", "dist", "build"]
}
```

`checkJs: false` and `strict: false` are intentional — we add TypeScript
gradually. Phase 12 tightens these settings as files convert.

**Verification:**
- [ ] `npx tsc --noEmit` runs without crashing
- [ ] Output may contain warnings about missing types from `modules/` — that's
      expected at this stage. The command itself must exit 0.

**Do NOT in this task:**
- Set `strict: true` or any sub-strict flag
- Modify any source files
- Add custom path mappings

**Commit:** `phase 00.3: add tsconfig with allowJs and permissive defaults`

---

### 0.4 — Add ESLint and Prettier configuration

**Status:** Complete — commit `9ad3bdc`

**Preconditions:**
- [ ] Tasks 0.1–0.3 complete

**Files to create:**
- `eslint.config.mjs` (flat config; ESLint 9.x is flat-config-native)
- `.prettierrc.json`
- `.prettierignore`

**ESLint config requirements:**
- Use `@eslint/js` recommended as base
- Disable rules that would require code changes outside the restructure
  scope (e.g., `no-unused-vars` set to warn, not error, in the existing
  codebase; will tighten in later phases)
- Allow Foundry globals (`game`, `CONFIG`, `Hooks`, `canvas`, `ui`, `foundry`,
  `CONST`, `ChatMessage`, `PIXI`, `$`) via `languageOptions.globals`
- Ignore `lib/`, `dist/`, `build/`, `node_modules/`
- **Human-maintainability rules** (per ADR-006 / PRINCIPLES.md 28-30):
  - `max-lines: ["error", { max: 500, skipBlankLines: true, skipComments: true }]`
  - `max-lines-per-function: ["error", { max: 50, skipBlankLines: true, skipComments: true }]`
  - `complexity: ["error", 10]`
  - `max-depth: ["error", 4]`
  - `max-params: ["error", 5]`
  Apply as errors to new directories (`modules/rules/`, `modules/data/`,
  `modules/settings/`, `modules/hooks/`, `modules/migrations/`) created by
  later phases. For legacy `modules/` files, override these rules to warnings
  (or disable) via an ESLint `overrides` block until Phase 12 tightens them
  across the entire codebase.

**Prettier config:**
- Match the dominant style of the existing codebase (run `git log` against
  a couple of files to infer; appears to be 2-space indent, double quotes,
  semicolons, trailing commas where valid)

```json
{
  "tabWidth": 2,
  "useTabs": false,
  "singleQuote": false,
  "semi": true,
  "trailingComma": "es5",
  "printWidth": 120,
  "arrowParens": "always"
}
```

`.prettierignore`:
```
node_modules
lib
dist
build
*.min.js
*.min.css
```

**Verification:**
- [ ] `npx eslint .` runs (warnings expected; the command must exit 0
      since we set most rules to warn at this stage)
- [ ] `npx prettier --check modules/swffg-main.js` runs (may show formatting
      diffs; that's expected and acceptable — we do NOT format existing files)

**Do NOT in this task:**
- Run `eslint --fix` or `prettier --write` against existing source files
- Add rules that would require code changes throughout the codebase
- Configure overrides that change behavior per-file

**Commit:** `phase 00.4: add eslint and prettier config`

---

### 0.5 — Add vitest configuration and global Foundry mocks

**Status:** Complete — commit `2de8b3e`

**Preconditions:**
- [ ] Tasks 0.1–0.4 complete

**Files to create:**
- `vitest.config.mjs`
- `tests/setup.ts`

**vitest.config.mjs requirements:**
- Use jsdom or happy-dom environment (Foundry code touches DOM)
- Run setup file `tests/setup.ts` before every test file
- Include pattern: `tests/**/*.test.{js,ts}`
- Exclude: `node_modules`, `cypress`, `e2e`

**tests/setup.ts requirements:**
- Define minimum Foundry globals as `globalThis.game`, `globalThis.CONFIG`,
  `globalThis.Hooks`, `globalThis.CONST` as empty stubs / sensible defaults
- Define `globalThis.foundry.utils.mergeObject` minimally (deep-merge two objects)
- Stub `globalThis.ui.notifications.warn/info/error` as no-ops
- Provide a `resetFoundryGlobals()` helper for use in beforeEach

This setup is intentionally minimal. Each test file may add to globals as needed.
Do not attempt a full Foundry mock — that's a tarpit.

**Verification:**
- [ ] `npx vitest run --reporter=verbose` runs (the existing
      `tests/modifiers.test.js` will likely fail; that's task 0.8)
- [ ] vitest itself exits without configuration errors

**Do NOT in this task:**
- Modify any test files
- Create new tests
- Mock the entire Foundry API

**Commit:** `phase 00.5: add vitest config and minimal foundry mocks`

---

### 0.6 — Create scripts/verify.mjs orchestrator

**Status:** Complete — commit `eea401a`

**Preconditions:**
- [ ] Tasks 0.1–0.5 complete

**Files to create:**
- `scripts/verify.mjs`
- `scripts/smoke-load.mjs` (placeholder; full implementation later)
- `scripts/replay-migrations.mjs` (placeholder; Phase 11 implements)
- `scripts/check-comments.mjs` (heuristic vacuous-comment detector; see ADR-006)

**verify.mjs behavior:**
- Runs each gate in order from `VERIFICATION.md`
- Each gate is a shell command (use `node:child_process` `spawn` with stdio inherited)
- Fail-fast: stop on first non-zero exit
- Print a summary line per gate: `[PASS]` / `[FAIL]` / `[SKIP]`
- Exit 0 only if all gates pass (or all are explicitly skipped via env var
  for development; don't add a skip flag yet — that's a future ADR)

**Gate order (per VERIFICATION.md):**
1. `npx tsc --noEmit`
2. `npx eslint . --max-warnings 0`  (will fail at this stage on legacy files;
   that's expected — document in VERIFICATION.md "Known failures" per task 0.11)
3. `node scripts/check-comments.mjs` (heuristic vacuous-comment detector)
4. `npx vitest run`
5. `npx vite build`
6. `node scripts/smoke-load.mjs`
7. `node scripts/replay-migrations.mjs`

**smoke-load.mjs (placeholder):**
- Read `system.json`, verify it parses
- Verify each file in `esmodules[]` exists in the build output
- Exit 0 if both checks pass
- This is a placeholder; the full smoke loader can be expanded in a later
  task once we know what V13 integration tests are needed

**replay-migrations.mjs (placeholder):**
- For now, just print "no fixtures yet" and exit 0
- Phase 11 fills this in properly

**check-comments.mjs (heuristic):**
- Walk `modules/` and `tests/` for `.js`/`.ts` files
- For each line containing a `//` comment, check if the comment is a 1:1
  paraphrase of the immediately following line of code (e.g.,
  `// increment counter` followed by `counter++`)
- Heuristic: flag if normalized words in the comment overlap >50% with
  identifier words in the next line of code
- Print warnings to stderr; exit 1 only if flagged comments appear in new
  code (files in `modules/rules/`, `modules/data/`, `modules/settings/`,
  `modules/hooks/`, `modules/migrations/`)
- For legacy files: warn only, exit 0 (tightens in Phase 12)
- Support a `// keep-comment` marker on the line above the flagged comment
  to opt out when the heuristic fires wrongly
- This is intentionally imperfect; the goal is to catch obvious offenders,
  not be exhaustive (PRINCIPLES.md 31 is the actual contract)

**Verification:**
- [ ] `npm run verify` runs end-to-end (some gates fail; that's fine)
- [ ] The output clearly shows which gates passed and which failed
- [ ] verify.mjs exits non-zero (because of failing gates) — this proves
      the fail-fast logic works

**Do NOT in this task:**
- Try to make all gates pass (the codebase has too many lint and type issues;
  fixing them is later phases' work, and we document them as known failures
  in VERIFICATION.md per task 0.11)
- Implement full migration replay (Phase 11)

**Commit:** `phase 00.6: add verify.mjs orchestrator and placeholder scripts`

---

### 0.7 — Add Foundry V13 type definitions

**Status:** Complete — commit `cf87a04`

**Preconditions:**
- [ ] Tasks 0.1–0.6 complete

**Files to create:**
- `types/foundry-v13.d.ts`

**Source:**
- Use a community-maintained Foundry V13 types package (e.g., from the
  League of Extraordinary FoundryVTT Developers GitHub org). Find the latest
  version that matches Foundry V13.
- Either install it as a dev dependency (preferred; add to `package.json`
  in this task) OR vendor it into `types/foundry-v13.d.ts`. Document the
  choice and version in a comment at the top of the file.

**Verification:**
- [ ] `npx tsc --noEmit` recognizes Foundry globals when they are explicitly
      referenced in a `.ts` file (write a one-line test file in `types/.smoke.ts`
      that references `Game` or similar, then delete it after verifying)
- [ ] `npm run verify` typecheck gate behavior is unchanged

**Do NOT in this task:**
- Modify any existing source files to use the types
- Convert any JS files to TS

**Commit:** `phase 00.7: add foundry v13 type definitions`

---

### 0.8 — Wire existing tests/modifiers.test.js to vitest and document failures

**Status:** Complete — commit `6b1e4ba`

**Preconditions:**
- [ ] Tasks 0.1–0.7 complete

**Files touched:**
- `tests/modifiers.test.js` — only enough to make vitest discover it; do not
  rewrite tests
- `docs/restructure/VERIFICATION.md` — document the failures

**Steps:**
1. Run `npx vitest run tests/modifiers.test.js`
2. Observe the failures (likely: fixtures use `data:` instead of `system:`;
   custom suite runner incompatible with vitest)
3. **Do NOT fix the tests.** Document the failure mode in `VERIFICATION.md`
   "Known failures" with a reference to the future task that will fix them
   (Phase 5 task TBD when DataModels exist).
4. If vitest cannot even discover the test (e.g., the custom runner crashes
   on import), add a minimal `.skip` or rename the file to `tests/modifiers.test.js.legacy`
   so vitest doesn't try to run it. Document this choice as an ADR.

**Verification:**
- [ ] `npx vitest run` runs without crashing
- [ ] If tests run, their failure count is documented in `VERIFICATION.md`
- [ ] If tests are skipped/renamed, the rationale is in `decision-log.md`

**Do NOT in this task:**
- Update test fixtures from `data:` to `system:`
- Rewrite the custom test runner
- Add new tests

**Commit:** `phase 00.8: wire existing tests to vitest, document failures`

---

### 0.9 — Add CI workflow

**Status:** Complete — commit `00fb003`

**Preconditions:**
- [ ] Tasks 0.1–0.8 complete

**Files to create:**
- `.github/workflows/ci.yml`

**Workflow requirements:**
- Trigger on push and pull_request
- Run on `ubuntu-latest`
- Node 20.x
- Steps: checkout, setup-node with caching, `npm ci`, `npm run verify`
- Upload `dist/` (or `build/`) as an artifact on the main branch
- Do NOT fail the workflow on known-tolerated `npm run verify` failures yet —
  for Phase 0, the workflow's purpose is visibility, not enforcement

**Verification:**
- [ ] Push to a feature branch; verify the workflow runs
- [ ] Workflow exits with the same exit code as local `npm run verify`

**Do NOT in this task:**
- Add deployment, release, or publishing steps
- Add matrix builds (Windows/Mac) — that's a future enhancement
- Configure branch protection rules (manual operator action)

**Commit:** `phase 00.9: add CI workflow`

---

### 0.10 — Add .restructure/ to .gitignore

**Status:** Complete — commit `dca2ffa`

**Preconditions:**
- [ ] Tasks 0.1–0.9 complete

**Files modified:**
- `.gitignore`

**Steps:**
1. Append two lines to `.gitignore`:
   ```
   # Restructure scratch space (session logs, intermediate artifacts)
   .restructure/
   ```
2. Verify nothing under `.restructure/` was previously tracked
   (`git ls-files .restructure/` should be empty)
3. Create the directory with a placeholder so future sessions can write logs:
   `.restructure/sessions/.gitkeep` (this file IS tracked, despite the gitignore,
   because it's the directory anchor — see git docs on `!` negation; just include
   it via `git add -f`)

Actually simpler approach: do NOT track `.gitkeep`. Each session creates its
own log file as needed; if the directory doesn't exist, the session creates it.

**Verification:**
- [ ] `git status` shows `.gitignore` modified, nothing else
- [ ] `mkdir -p .restructure/sessions && touch .restructure/sessions/test.md &&
      git status` shows nothing new

**Commit:** `phase 00.10: ignore .restructure/ scratch space`

---

### 0.11 — Document Phase 0 known failures in VERIFICATION.md

**Status:** Complete — commit `47cbd29`

**Preconditions:**
- [ ] Tasks 0.1–0.10 complete

**Files modified:**
- `docs/restructure/VERIFICATION.md`

**Steps:**
1. Run `npm run verify` one more time, capture the output
2. For each gate that fails or has warnings, add an entry under
   "Known failures" with:
   - Gate name
   - Discovery date
   - File/line if applicable
   - Owning task (the future phase task that will fix it; may be "TBD")
   - Workaround (typically "tolerated for Phase 0 exit")

**Verification:**
- [ ] `VERIFICATION.md` "Known failures" section has at least one entry per
      currently-failing gate
- [ ] Each entry has the four fields above

**Commit:** `phase 00.11: document phase 0 known failures`

---

### 0.12 — Verify Foundry V13 loads the system after build

**Status:** Partial — commit `f3c7ef4` (automated checks: build, dist/ structure, system.json validation, ESM file existence all pass; manual Foundry V13 launch + character/sheet/item/settings smoke deferred to operator)

**Preconditions:**
- [ ] Tasks 0.1–0.11 complete
- [ ] A local Foundry V13 install is available, OR a containerized Foundry
      instance can be spun up
- [ ] The fork system id (ADR-005) is reflected in `system.json` and `package.json`

**Steps:**
1. Run `npm run build`
2. Copy or symlink the build output to your Foundry `Data/systems/<fork-id>/`
3. Launch Foundry V13
4. Create a new world using the fork system
5. Verify:
   - World creates without errors in the console
   - You can create a character actor
   - You can open the character sheet (no errors)
   - You can create an item, embed it on the character
   - Settings UI shows the system's settings without errors

**Verification:**
- [ ] All five steps above succeed without console errors
- [ ] If errors are non-blocking (e.g., warnings about missing localization
      keys), document them as known issues in `VERIFICATION.md`; do not fix
      in Phase 0

**On failure:**
This is a blocker. Document the failure mode in `STATE.md` "Open issues" with:
- Foundry version
- Console output
- Reproduction steps
- Best guess at cause

End the session. A future task will address the blocker.

**Do NOT in this task:**
- Fix any runtime errors observed (out of scope; that's why we documented
  the current state — the fork should behave identically to upstream after
  Phase 0)
- Add new features or settings

**Commit:** `phase 00.12: verify foundry V13 loads forked system`

---

## On completing Phase 0

- All 12 tasks checked off in `STATE.md`
- `npm run verify` runs end-to-end (with documented known failures)
- Phase 0 box in "Phase progress" checked
- Update `STATE.md` "Current phase" to `phase-01-calculators`
- Update `STATE.md` "Current task" to `1.1` (whatever the first task of Phase 1 is)
- Copy Phase 1's task list into "Current phase tasks"
- Commit: `phase 00: foundation complete`
