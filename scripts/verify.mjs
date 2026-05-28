#!/usr/bin/env node
/**
 * verify.mjs — restructure verification orchestrator
 *
 * This is a PLACEHOLDER. The full implementation lands in Phase 0 task 0.6.
 *
 * Intent: run each verification gate in order, fail fast, exit non-zero on
 * first failure. See docs/restructure/VERIFICATION.md for the canonical
 * gate list and order.
 *
 * Once Phase 0 completes, this file should:
 *   1. Run `npx tsc --noEmit`
 *   2. Run `npx eslint . --max-warnings 0`
 *   3. Run `npx vitest run`
 *   4. Run `npx vite build`
 *   5. Run `node scripts/smoke-load.mjs`
 *   6. Run `node scripts/replay-migrations.mjs`
 *
 * Each gate's stdout/stderr inherits to the parent process. Summary line per
 * gate: `[PASS]`, `[FAIL]`, or `[SKIP]`.
 */

console.error("verify.mjs is a placeholder. Implement during Phase 0 task 0.6.");
console.error("See docs/restructure/phases/phase-00-foundation.md for the spec.");
process.exit(2); // non-zero so it's obvious the placeholder is in use
