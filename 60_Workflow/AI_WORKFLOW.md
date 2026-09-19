# AI Workflow

## Purpose

This project brain exists so multiple AI systems can work on LOCKED IN without depending on old chat history.

## Before work

Read:
1. `PROJECT.md`
2. `STATUS.md`
3. `DECISIONS.md`
4. `INDEX.md`
5. only relevant domain files

If the task touches legacy behavior, also read the relevant legacy source.

## During analysis

- separate facts from assumptions;
- mark open questions explicitly;
- do not silently promote an idea into a requirement;
- compare alternatives before recommending a direction;
- keep the user's cost and simplicity constraints visible.

## During implementation

- V2 is writable;
- legacy is read-only unless explicitly authorized;
- avoid unrelated refactors;
- preserve validated behavior;
- update tests/validation when behavior changes.

## After substantial work

Update only what changed:

### Decision changed
Update:
- `DECISIONS.md`
- relevant domain file

### Current priority/state changed
Update:
- `STATUS.md`

### Validation result changed
Update:
- corresponding file in `50_Validation`

### Technical architecture/data model changed
Update:
- corresponding file in `30_Technical`

### Migration state changed
Update:
- `40_Migration/MIGRATION.md`

## Handoffs

A new AI should not need a transcript dump.

The project files should answer:
- What is LOCKED IN?
- What has already been decided?
- What is still open?
- What is being worked on now?
- What is authoritative?
- What must not be changed?
