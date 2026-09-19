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

Legacy Polar AccessLink / Cloudflare integration (D-049) — discontinued, closed:

- The old Polar/Cloudflare integration has been discontinued. According to the user, the Polar connection was disconnected and the external Polar/Cloudflare integration was removed.
- No migration.
- No tokens.
- No Cloudflare Worker.
- No Polar AccessLink.
- Not re-implemented in V2 in any form.
- Running data in V2 is to be solved later natively / through the app's own architecture, including HealthKit where feasible. Feasibility of the native capabilities is still open (see [30_Technical/ARCHITECTURE.md](../30_Technical/ARCHITECTURE.md)).
- Any mention of Polar/Cloudflare in legacy material is historical reference only.

## Legacy protection

The legacy app remains usable and should not be destabilized during V2 development.
