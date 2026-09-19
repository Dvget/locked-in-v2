# Autonomous rebuild mandate

Authorized by the user on 2026-09-19: rebuild the whole LOCKED IN app in V2 (React Native / Expo) **without intermediate questions**. The user reviews the result afterwards. This file is the work order. `STATUS.md` ("Next steps") holds the slice list and the current progress.

## Goal

Rebuild the legacy app (`Dvget/locked-in`, branch `codex/locked-in-0.8.8`, read-only) functionally in V2, applying the V2 decisions in `DECISIONS.md` while porting. Per-area mapping and status: `40_Migration/LEGACY_TO_V2_MAP.md`. Legacy Swift tests are the behavior oracle for logic.

## Work loop per slice

1. Clone the legacy repo into a scratch folder outside this repo (read-only) and read the relevant Swift files and tests for the slice.
2. Port logic as pure TypeScript with tests (add `vitest` as dev dependency in slice 1). Port the matching legacy tests.
3. Build the UI on top, following `20_Design/UX_DESIGN.md`, `20_Design/DESIGN_FINDINGS_2026-09-19.md` (legacy design tokens are canonical, D-050) and the existing theme. German UI strings, English code identifiers.
4. Verify: `npx tsc --noEmit`, tests green, web check of the affected screens (Expo web, real browser check where possible).
5. Commit in small logical commits with a clear message, push to `origin/main`.
6. Update `STATUS.md` ("Next steps" progress) and the status column in `LEGACY_TO_V2_MAP.md`. Record any new decision in `DECISIONS.md` as **provisional** (next free ID).
7. Continue with the next slice. Do not stop to ask.

## Defaults for open decisions (all provisional; record in DECISIONS.md)

- **Persistence:** `expo-sqlite` on the phone behind a repository interface. In-memory repository for tests and web preview. Backup JSON stays readable against the legacy `BackupPayload` shape and gets an explicit schema version.
- **Detail screens:** no separate Dashboard detail screens. Dashboard shows the compact state (D-012, D-037); long-term analysis lives in Progress (D-013).
- **Weekly Report:** reachable from the Dashboard card and shown once automatically at the first app open of a new week (legacy behavior). Comparison rules: latest completed week vs previous, only comparable metrics.
- **Steps:** device pedometer (the CoreMotion equivalent, for example `expo-sensors`); HealthKit later. Only completed days count in averages.
- **Weight:** manual entry. Tone is goal-aware (lose / maintain / gain, D-016); default goal "maintain". No Bluetooth scale import.
- **Charts:** custom line/bar charts drawn with `react-native-svg` (Expo-compatible). No large chart library.
- **Exercise library:** reuse the legacy `exercise-library.json` (public domain, includes muscle metadata) as bundled data.
- **Running:** port the pure filter/distance/pace/split logic and the run screens; use `expo-location` (foreground and background) and `expo-speech` for cues. Store raw GPS points per run, separate from derived metrics (route map stays possible, D-044). **No elevation gain/loss** (show "–") until designed (Issue #19). Live Activity / lock-screen controls: not built, documented as open.
- **Goals in Settings:** weight direction, workouts per week, weekly step goal.

## Guardrails (never, even when unattended)

- Do not modify, commit to or push to the legacy repository or any other repo than `Dvget/locked-in-v2`.
- No force-push, no history rewrite, no deleting branches, releases or runs.
- Do not change the repo's visibility, the bundle id (`app.lockedin.v2`) or the app name ("LOCKED IN 2").
- No images or screenshots in Git. No secrets, tokens or personal data (the user's private email, home network addresses) in files or commits. Commit with the repo-local anonymous email.
- No paid services, no new accounts, no credentials.
- No new npm packages that are not free/open source. Prefer `npx expo install`.
- No copying of legacy Swift code; port behavior.

## Builds (allowed, free while the repo is public)

- A native rebuild is needed only when native dependencies were added (for example `expo-sqlite`, `expo-location`, `expo-sensors`, `expo-speech`, `react-native-svg`). Batch them: add the native dependencies of several slices first, then dispatch **one** `Build iOS Dev Client (unsigned)` run, watch it, fix it (max 2 retries), and continue.
- At most 5 builds in total. The build publishes a release and updates the SideStore feed automatically.
- Check the run before continuing. Never leave a failing workflow behind.

## Keep commands simple (fewer permission prompts)

The user may not be at the PC. Shell commands that contain subshells (`$(...)`, backticks), several commands chained with `&&`/`;`, pipes into other tools, or heredocs trigger a manual approval even in permissive modes, and they cannot be "always allowed". So:

- Use one simple command per call. Store values in files or read them from a previous result instead of using `$(...)`.
- Prefer the dedicated tools over the shell: Read, Write, Edit, Glob, Grep for files and search.
- Use plain `git add <paths>`, `git commit -m "..."`, `git push origin main` as separate calls.
- Do not use `cd ... &&` chains; use absolute paths or the tool's working directory.
- Do not write helper scripts only to bundle several commands.

## No questions: how to decide

If something is unclear, pick the simplest option that fits `PROJECT.md` and `DECISIONS.md`, write it into the review list, and continue. Ask only if continuing would break a guardrail.

## Resume safety

Long sessions get compacted automatically. Keep `STATUS.md` ("Next steps") current after every slice so any later chat can continue from the last commit. Commit early and often. If the usage limit is nearly reached, finish the current slice cleanly (tests green, committed, pushed) and stop.

## Finish

When all slices are done (or the limit is reached), write `60_Workflow/REBUILD_REVIEW.md` with:

- what was built, per slice, and the commit range;
- every default decision taken and why;
- known gaps and things that could not be verified without the iPhone ("please check on the iPhone": GPS in background, pedometer, audio, SQLite persistence, backup file access, notifications);
- how to install the latest build (SideStore source is in `SETUP_LOG_2026-09-19.md`).

Then summarize in plain German for the user (short, no jargon).
