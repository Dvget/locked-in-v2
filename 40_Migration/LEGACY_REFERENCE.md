# Legacy Reference

## Legacy code repository

Repository:
`Dvget/locked-in`

Active legacy branch referenced during the V2 planning phase:
`codex/locked-in-0.8.8`

Confirmed release noted in legacy project state:
`0.8.8 Build 60`

## Important legacy sources of truth

When behavior parity matters, read:
1. legacy `PROJECT_STATE.md`;
2. relevant GitHub issue;
3. current code on the referenced branch;
4. fresh build/test evidence.

## Known workstreams

### Running validation
GitHub Issue #19.

Important current understanding:
- distance/GPS behavior is strong;
- pace is acceptable;
- elevation remains the significant unresolved validation issue.

Do not casually change validated distance/pace behavior during migration.

### Windows-first V2 feasibility
GitHub Issue #36.

This became the highest migration priority during V2 planning.

## Existing iOS build/signing workflow

The legacy project currently uses GitHub macOS to build an unsigned device app and packages an IPA.

SideStore then handles the user's free Apple-account signing/install workflow.

The proposed Expo Dev Client + unsigned GitHub build + SideStore workflow is a hypothesis until proven.

## Legacy Obsidian workspace

Repository:
`Dvget/obsidian-ai-workspace`

The old Feedback System is reference material only.

Do not recreate its cockpit/dashboard architecture by default. V2's vault is deliberately simpler.
