# Phase 13 — V14 Compatibility Certification

## Goal

Certify that the restructured system runs on both Foundry V13 and V14 with
no functional regression and full feature parity. Per ADR-008, dual-version
support is a structural commitment; this phase is the final certification.

## Why this phase last

Earlier phases must already follow PRINCIPLES.md 39-40 (feature detection
over version-string sniffing; no deprecated API usage). Phase 13 is the
audit and certification step that confirms the discipline held throughout
and resolves any drift that crept in.

It cannot run earlier because:
- DataModels (Phase 5) introduce schema patterns that V14 may handle differently
- ApplicationV2 sheets (Phase 8) are the surface most likely to diverge
  between V13 and V14
- TypeScript coverage (Phase 12) catches some cross-version API drift via
  type errors once V14 type definitions are added

## Phase preconditions

- [ ] Phases 0-12 complete
- [ ] `npm run verify` is green on Foundry V13
- [ ] Foundry V14 binary available locally (release or release candidate)
- [ ] `test-worlds/` includes at least one fixture captured on V14
- [ ] V14 type definitions exist (vendor from community types package)

## Phase postconditions (stop gate)

- [ ] `system.json` `compatibility` is `{ minimum: 13, verified: 14, maximum: 14 }`
- [ ] `npm run verify` passes against both V13 and V14 (matrix smoke load)
- [ ] CI matrix builds against both versions
- [ ] All manual smoke matrices from earlier phases re-run successfully on V14
- [ ] Every Foundry API call in the codebase is documented as either:
  - Stable in both V13 and V14, OR
  - Feature-detected with both code paths exercised, OR
  - Wrapped in a shim in `modules/foundry-compat/` with an ADR justifying the shim
- [ ] No deprecated API usage remains; deprecation warnings in V14 console are zero
- [ ] Migration replay runs against worlds captured on both V13 and V14
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")

## Files potentially created

```
modules/foundry-compat/                ← only if shims are needed
├── index.js                           ← exports a compat namespace
└── <api-name>.js                      ← one per shimmed API
types/foundry-v14.d.ts                 ← V14 type definitions
```

If the discipline of PRINCIPLES.md 39-40 was followed throughout, the
`modules/foundry-compat/` directory may not exist at all — in-place feature
detection is preferred. A `foundry-compat/` directory with many files is a
sign of accumulated debt that should be audited against the discipline.

## Files modified

- `system.json` — update `compatibility` block
- `package.json` — add V14 type definitions as a dev dependency (if vendored
  as a package rather than as a `types/` file)
- `.github/workflows/ci.yml` — matrix build over Foundry versions
- Per-API: any file where V13/V14 divergence requires adaptation

## Tasks (to be detailed before phase begins)

Suggested breakdown:
- Task 13.1: Audit all Foundry API usage; produce a list of V13/V14
  differences encountered
- Task 13.2: For each difference, choose feature detection or shim;
  implement; test on both versions
- Task 13.3: Add V14 type definitions to `types/`
- Task 13.4: Update `system.json` compatibility range
- Task 13.5: Implement matrix CI build (V13 + V14)
- Task 13.6: Run all earlier phases' manual smoke matrices against V14
- Task 13.7: Capture a V14 world fixture for `test-worlds/`
- Task 13.8: Verify Phase 13 stop gate

The first session in Phase 13 produces the detailed audit (13.1) before
starting other tasks. The audit drives the per-API decisions in 13.2.

## Anti-creep notes

- **Do not** refactor code while certifying. If a V14 incompatibility is
  found in already-shipped code, the fix is the smallest possible change
  that restores compatibility, not a redesign.
- **Do not** drop V13 support. The decision per ADR-008 is dual support,
  not "V14 only."
- **Do** prefer feature detection over shims. A shim layer adds an
  abstraction that future maintainers must learn; feature detection in
  place is self-documenting.
- **Do** open ADRs for any shim that does prove necessary, documenting
  what V13/V14 difference required it and whether/when the shim can be
  removed (e.g., "when V13 is dropped from minimum support").

## After Phase 13

The restructure is complete. The runbook does NOT get deleted (per
README.md "Runbook permanence"). Future Foundry versions follow the same
dual-compatibility pattern via new ADRs; for example, when Foundry V15
ships, an ADR-N proposes updating to `{ minimum: 14, verified: 15,
maximum: 15 }` and a new "Phase 14 — V15 Compatibility Certification" is
added following the same template as this phase.
