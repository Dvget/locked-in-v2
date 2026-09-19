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
- GitHub repo `Dvget/locked-in-v2` created (currently public for free builds); whole V2 folder is one Git repository.
- First iOS Dev Client build succeeded on 2026-09-19 (run `35457817569`, about 5 minutes) after the repo was made public; the earlier block was the exhausted free private-repo quota. The GitHub build produces an unsigned IPA and a SideStore release. Install on the iPhone, Metro connection and Fast Refresh are still unverified. Details: [60_Workflow/SETUP_LOG_2026-09-19.md](60_Workflow/SETUP_LOG_2026-09-19.md).
- Still open: SideStore install of the IPA, Dev Client connection to Metro, iPhone Fast Refresh, native capabilities (location, HealthKit, Live Activities, audio/haptics).
- A sensible next product/development step can begin in parallel via Expo Web.

## App scaffold status (2026-09-19)

- Minimal navigable app structure exists under `app/src` (Dashboard, Progress, Settings tabs; Workout, Running, Weekly Report screens). Placeholders only, no feature logic. See [30_Technical/ARCHITECTURE.md](30_Technical/ARCHITECTURE.md).
- React Navigation is used provisionally (D-048).
- Polar AccessLink / Cloudflare migration is closed and discarded (D-049). No open V2 task remains for it; V2 contains no Polar or Cloudflare code or configuration.
- System appearance is forced to dark (`userInterfaceStyle: "dark"` in `app/app.json`), consistent with D-033.
- Dashboard V1 implemented with static dummy data (`app/src/data/dashboardDummy.ts`): header, Workout/Running start tiles, week summary, weight and training mini trends, Weekly Report card, last achievement. No real data connection yet.
- Mobile-width web preview: on web the app is limited to 430 px (`AppFrame`); native renders full width.
- Real data connection (steps, weight, workouts, runs, trends, PR logic) remains open.
- Checked on Expo Web and TypeScript only; not yet run on a native iOS Dev Client.

## Next steps (handoff for the next chat)

Keep this list current after every larger work block. A new chat starts from here.

**Done (2026-09-19):** the technical proof works end to end. GitHub builds an unsigned Dev Client IPA (about 5 min, workflow `Build iOS Dev Client (unsigned)`), publishes it as a GitHub release plus SideStore feed, SideStore installs it as "LOCKED IN 2" (`app.lockedin.v2`, next to the legacy app), the Dev Client finds Metro on the PC over Wi-Fi. Web preview also works. The SideStore feed is served from public release files, so the repo must stay public (license: all rights reserved) or a separate public distribution repo is needed later. Free Actions minutes only apply to public repos.

**Rebuild progress (autonomous rebuild, 2026-09-19): all 8 slices are implemented.** Domain logic has 100+ vitest tests; type check and the web preview pass. Everything that needs hardware is unverified: see `60_Workflow/REBUILD_REVIEW.md` ("please check on the iPhone"). New decisions D-051 to D-060 are provisional. The next step for the user is to install the latest Dev Client build and walk through the checklist in the review file; the next step for Claude is to fix what the iPhone check finds.

**Slice plan (kept for reference; all done):** rebuild the legacy app 1:1 in slices, applying V2 decisions while porting. Map and status per area: `40_Migration/LEGACY_TO_V2_MAP.md`. Legacy source (read-only): `Dvget/locked-in`, branch `codex/locked-in-0.8.8`; clone it into a scratch folder outside this repo. V2 decisions in `DECISIONS.md` override legacy behavior. Legacy Swift tests in `LockedInTests/` are the behavior oracle.

Slices, in this order:
1. **Domain foundation (pure TypeScript, no native code, no device rebuild):** data types, Monday-first week utilities, analytics ported from `TrackingAnalytics.swift`, `DashboardAnalytics.swift`, `StrengthProgressMetric.swift`, `StrengthProgression.swift` (run summary, weekly run change, steps preferred sample and completed-day average, weekly goal status, percentage change, weekly weight averages, workout index). Add a test runner (proposal: `vitest` as dev dependency) and port the matching legacy tests.
2. **Data layer:** repository interface with an in-memory implementation and seed data first; then local database on the phone (proposal: `expo-sqlite`, native, needs one Dev Client rebuild; free while the repo is public). Backup JSON must stay readable against the legacy `BackupPayload` shape (add an explicit schema version).
3. **Dashboard with real data** (replace `dashboardDummy.ts`), keep the current design.
4. **Training plans and exercise library** (legacy `exercise-library.json` is public domain; include muscle metadata for D-043/D-046).
5. **Active workout** (sets, resume, rest timer, skip/revisit per D-019 to D-024).
6. **Backup / export / import.**
7. **Progress, then Weekly Report** (new design, legacy comparison rules).
8. **Running last** (depends on unproven native capabilities: background location, Live Activity, audio; port the pure filter/distance/pace/split logic as TypeScript with legacy tests as oracle; do not port elevation; keep raw GPS points so a route map stays possible, D-044).

Open decisions: persistence technology (default: `expo-sqlite` unless the user objects), Dashboard detail screens vs Progress only, whether Weekly Report also auto-opens once per week, Bluetooth scale import, later rename to "LOCKED IN" (display name is easy; the bundle id decides whether V2 replaces the legacy app).

Ideas, not decided: (1) Expo Go (free App Store app) could run JS-only UI work on the iPhone with Fast Refresh without any build or signing; it does not support all native parts (for example Live Activities, HealthKit), and support for SDK 57 was not checked. (2) A Release build option in the workflow for the everyday, standalone app. (3) Other free routes to run own apps on iOS (for example Sideloadly on Windows) exist, but SideStore is the chosen route.

Housekeeping: Actions minutes are limited for private repos; ask before dispatching builds. Builds are only needed when native dependencies change (for example `expo-sqlite`).

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
