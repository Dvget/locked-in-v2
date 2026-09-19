# LOCKED IN V2 — STATUS

## Current phase

**Product definition complete enough to begin V2 project setup.**

The next major phase is technical feasibility and V2 architecture.

## Current high-level state

- Legacy SwiftUI app remains intact and usable.
- V2 will be a separate code repository.
- V2 will use a separate Obsidian vault/project brain.
- The new vault is intentionally simple and AI-oriented.
- It may later be copied as a self-contained project folder into a larger personal "second brain" vault.
- No plugin-heavy dashboard or feedback cockpit is planned for this vault.

## Highest technical priority

Prove the Windows-first React Native / Expo workflow before committing to full migration.

Legacy GitHub Issue #36 is the current migration/feasibility workstream.

Required proof includes:
- React Native + Expo development under Windows;
- web preview;
- Expo Development Client on iPhone;
- whether an unsigned Dev Client IPA can be built on GitHub/macOS and installed through the existing free SideStore signing workflow;
- Fast Refresh from Windows to the physical iPhone;
- identifying which changes require a native rebuild;
- checking required native capabilities such as location/background tracking, HealthKit, Live Activities, haptics/audio and local persistence;
- confirming the workflow stays free.

## Product-definition status

The following are sufficiently defined:
- product purpose and boundaries;
- main navigation;
- dashboard role;
- workout behavior;
- running behavior;
- progress role;
- steps;
- weight;
- weekly report;
- settings;
- backup/export;
- goals;
- gamification;
- future features;
- UX principles;
- broad visual direction.

## Important open decisions

- final color system;
- exact card visual language;
- final KPI/chart hierarchy;
- exact workout index;
- exact running index;
- muscle-group coverage/progress logic;
- final V2 data model;
- final React Native / Expo architecture;
- free-signing feasibility for all required iOS capabilities;
- detailed migration plan.

## Immediate next steps

1. Create the standalone V2 repository.
2. Prove the Windows-first Expo workflow.
3. Define technical architecture from the proof results.
4. Define V2 data model.
5. Plan migration by feature/behavior rather than by blindly porting legacy code.
