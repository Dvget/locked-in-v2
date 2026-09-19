# Migration Strategy

## Principle

Do not rebuild V2 by blindly porting the old codebase.

Migrate:
- validated behavior;
- validated algorithms;
- useful data semantics;
- proven UX concepts.

Reconsider:
- architecture;
- technical implementation;
- visual design;
- old workarounds;
- legacy-only structures.

## Migration stages

### Phase 1 — Prove the toolchain
Prove the Windows-first React Native/Expo workflow and all required iOS capabilities.

### Phase 2 — Define V2 foundations
- repository;
- architecture;
- data model;
- design system;
- backup strategy;
- development/test workflow.

### Phase 3 — Port product behavior
Migrate feature areas in controlled slices.

Likely order should be decided after architecture proof.

### Phase 4 — Validate against legacy
For behavior that already works well, compare V2 with legacy rather than assuming the rewrite is correct.

## Legacy protection

The legacy app remains usable and should not be destabilized during V2 development.
