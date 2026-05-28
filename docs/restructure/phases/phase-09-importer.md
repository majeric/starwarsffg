# Phase 09 — Importer Pipeline Refactor

## Goal

Split the 3322-line `modules/importer/import-helpers.js` into a structured
pipeline: parsers → transformers → writers. Per-type importers become thin
orchestration over the pipeline.

## Why this phase

The current import-helpers monolith mixes XML parsing, schema transformation,
compendium I/O, and error recovery. Bugs in one stage hide bugs in another.
A clean pipeline:
- Tests each stage independently
- Adds dry-run mode (show what would be written without writing)
- Fails fast — bad XML caught in parse step, not 80% through write
- Makes adding new content sources (beyond OggDude) tractable

## Phase preconditions

- [ ] Phase 5 (DataModels) complete — writers target DataModel-shaped objects
- [ ] `npm run verify` is green

## Phase postconditions

- [ ] `modules/importer/oggdude/parsers/<type>-parser.js` for each content type
- [ ] `modules/importer/oggdude/transformers/<type>-transformer.js` for each
- [ ] `modules/importer/oggdude/writers/compendium-writer.js` (single writer
      generic over DataModel-shaped input)
- [ ] `modules/importer/oggdude/pipeline.js` orchestrates parser → transformer → writer
- [ ] `modules/importer/oggdude/importers/<type>.js` files become thin: they
      configure the pipeline for their type and run it
- [ ] `modules/importer/import-helpers.js` is DELETED (or reduced to a few
      cross-cutting utilities; if it survives, < 200 lines)
- [ ] Each stage has unit tests with fixture data
- [ ] Dry-run mode works: `await pipeline.run({ dryRun: true })` returns
      what would be written
- [ ] Full OggDude import against a known dataset produces byte-identical
      output to pre-refactor (or differences are documented)
- [ ] `npm run verify` is green
- [ ] Future-maintainer check passes (see PRINCIPLES.md "The future-maintainer check")
- [ ] V13/V14 compatibility verified per ADR-008 (CompendiumCollection write APIs may differ between versions)

## Stage contracts

**Parser:** XML string (or DOM) → typed intermediate representation
```js
// modules/importer/oggdude/parsers/species-parser.js
export function parseSpecies(xmlDoc) {
  // returns { key, name, characteristics: {...}, abilities: [...], ... }
  // pure: no side effects, no I/O
}
```

**Transformer:** IR → DataModel-shaped source object
```js
// modules/importer/oggdude/transformers/species-transformer.js
export function transformSpecies(ir) {
  // returns { name, type: "species", system: { ... } } matching SpeciesData schema
  // pure: no side effects, no I/O
}
```

**Writer:** DataModel-shaped object → compendium document
```js
// modules/importer/oggdude/writers/compendium-writer.js
export async function writeToCompendium(pack, sourceObject) {
  // performs the Foundry write
  // side effects only here
}
```

## Anti-creep notes

- **Do not** change the data format produced. The migration from Phase 5
  determined the target shape; transformers produce that shape.
- **Do not** "improve" the imported content. If OggDude data has quirks,
  preserve them (post-import editing is a separate user workflow).
- **Do** add error context. Each stage should produce errors that name the
  source file, the type, and the specific field that failed.

## Tasks (to be detailed before phase begins)

Suggested breakdown:
- Task 9.1: Define the pipeline interface and stage contracts in `pipeline.js`
- Task 9.2: Extract the generic compendium writer
- Tasks 9.3-9.N: One per content type — parser + transformer + tests
- Task 9.N+1: Migrate per-type importer files to use the new pipeline
- Task 9.N+2: Delete import-helpers.js
- Task 9.N+3: Add dry-run mode
- Task 9.N+4: Verify Phase 9 stop gate
