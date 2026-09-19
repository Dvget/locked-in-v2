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

## Toolchain proof status (as of 2026-09-19)

Details: [60_Workflow/SETUP_LOG_2026-09-19.md](60_Workflow/SETUP_LOG_2026-09-19.md)

- Web development workflow proven (Windows, Expo Web, Metro, Claude edits local code, browser updates).
- Expo SDK 57 + `expo-dev-client` set up.
- GitHub repo `Dvget/locked-in-v2` (private) created; whole V2 folder is one Git repository.
- First iOS Dev Client build (GitHub Actions run `35449440001`) is blocked by GitHub Billing / Spending Limit; the macOS runner never started.
- Native iOS Dev Client feasibility remains open (unsigned IPA, SideStore install, iPhone Fast Refresh, native capabilities).
- A sensible next product/development step can begin in parallel via Expo Web.

## App scaffold status (2026-09-19)

- Minimal navigable app structure exists under `app/src` (Dashboard, Progress, Settings tabs; Workout, Running, Weekly Report screens). Placeholders only, no feature logic. See [30_Technical/ARCHITECTURE.md](30_Technical/ARCHITECTURE.md).
- React Navigation is used provisionally (D-048).
- Polar import / Cloudflare token system will not be migrated (D-049).
- System appearance is forced to dark (`userInterfaceStyle: "dark"` in `app/app.json`), consistent with D-033.
- Dashboard V1 implemented with static dummy data (`app/src/data/dashboardDummy.ts`): header, Workout/Running start tiles, week summary, weight and training mini trends, Weekly Report card, last achievement. No real data connection yet.
- Mobile-width web preview: on web the app is limited to 430 px (`AppFrame`); native renders full width.
- Real data connection (steps, weight, workouts, runs, trends, PR logic) remains open.
- Checked on Expo Web and TypeScript only; not yet run on a native iOS Dev Client.

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
