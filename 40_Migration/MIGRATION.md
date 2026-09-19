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

Toolchain proof status (2026-09-19, details in [60_Workflow/SETUP_LOG_2026-09-19.md](../60_Workflow/SETUP_LOG_2026-09-19.md)):
- Web part: successful.
- Native iOS part: still open.
- The current test (unsigned iOS Dev Client build on GitHub Actions) is blocked by GitHub Actions billing / spending limit.

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

## Explicitly not migrated

- The legacy Polar import and the Cloudflare/token system used for it are not part of LOCKED IN V2 and must not be migrated (D-049).

## Legacy protection

The legacy app remains usable and should not be destabilized during V2 development.
