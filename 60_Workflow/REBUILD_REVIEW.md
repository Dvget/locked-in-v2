# Rebuild review — autonomous rebuild, 2026-09-19

Result of the autonomous rebuild ordered in [AUTONOMOUS_REBUILD.md](AUTONOMOUS_REBUILD.md). Work order followed without intermediate questions. Everything was checked with `npx tsc --noEmit`, `npm test` (vitest, 100+ tests) and the Expo web preview. An iOS JavaScript bundle export also compiled. **No feature that needs the phone hardware has been run on a phone.** That is your job now; the checklist is below.

Commit range: `87813af` (first rebuild commit) to the current `main` head. Decisions: D-051 to D-060 in [DECISIONS.md](../DECISIONS.md) (all provisional).

## What was built, per slice

| Slice | Content | Main files | Commits |
|---|---|---|---|
| 1 Domain foundation | Monday-first date helpers, run/step/weight/strength analytics, dashboard comparisons, workout index, plan validation and plan schedule, step sync policy. Legacy tests ported as vitest tests. | `app/src/domain/dates.ts`, `analytics.ts`, `strength.ts`, `plans.ts` | `87813af` |
| 2 Data layer | `Repository` interface, in-memory and `expo-sqlite` implementations, React store, backup JSON (legacy shape + `schemaVersion`), bundled exercise library (public domain) with German names and search, custom exercises. Native dependencies added in one batch. | `app/src/data/*`, `app/src/domain/exercises.ts` | `a31ebc7` |
| 3 Dashboard | Real data (D-052), goal-aware weight tone (D-016), achievements (D-060), quick weight entry, resume card, legacy design tokens (D-050), legacy footer (icons only) and header. | `app/src/domain/dashboard.ts`, `achievements.ts`, `app/src/screens/DashboardScreen.tsx` | `eec34cc`, `68afc97`, `11437be` |
| 4 Training plans | Plan list and editor (sets, start weight/reps, increment, rest, per-exercise rep range, workout type, alternatives, reorder), exercise picker with custom exercises, 30-day plan history with restore. | `app/src/screens/settings/*`, `app/src/domain/planHistory.ts` | `9a6af87` |
| 5 Active workout | Plan suggestion, slot-by-slot flow, comparison with the last run of the same exercise (D-020), progression hint at the top of the rep range, skip and revisit through an overview (D-021), alternatives with own history (D-022), editable sets, wall-clock rest timer with haptics + spoken cue + notification (D-023, D-024), resume, completion summary with index and earned bests. | `app/src/screens/workout/*`, `app/src/domain/workoutSession.ts` | `6401e5e` |
| 6 Backup / export | Backup and restore (legacy-compatible JSON), recovery snapshot before import, full tracking export, GPX export, optional automatic backup folder, Goals and About screens. | `app/src/screens/settings/DataBackupScreen.tsx`, `app/src/data/backup.ts`, `app/src/native/files.ts` | `9a6af87` |
| 7 Progress and Weekly Report | Training index chart, per-exercise stats, running series, weight range chart, history lists (hide, delete), Bestwerte list (D-029). Weekly Report with new layout, comparable-only metrics, 8-week context, standouts, shown once per new week (D-053). | `app/src/screens/ProgressScreen.tsx`, `HistoryScreen.tsx`, `DetailScreens.tsx`, `WeeklyReportScreen.tsx`, `app/src/domain/progress.ts`, `weeklyReport.ts` | `99b3ae0`, `dd6864c` |
| 8 Running | Legacy filter, distance, rolling pace, km splits and session clock ported with the legacy tests; GPS engine with background task, spoken km cues, pause/resume, checkpoint restore, summary with splits and earned bests, manual run entry, raw GPS points stored (D-044). Steps via pedometer (D-054). | `app/src/domain/running.ts`, `app/src/native/runEngine.ts`, `steps.ts`, `app/src/screens/RunningScreen.tsx` | `99b3ae0`, `dd6864c` |

## Default decisions taken and why

All listed in DECISIONS.md D-051 to D-060. Short version:

- **SQLite behind a repository (D-051):** local, free, offline; the interface keeps the storage swappable and testable. Web preview uses demo data in memory.
- **No Dashboard detail screens (D-052):** keeps the Dashboard low-density (D-012, D-037) and puts analysis into Progress (D-013).
- **Weekly Report opens once per week (D-053):** legacy behavior; the key is the Monday date of the current week.
- **Steps via pedometer, 7 days, completed days only (D-054):** the CoreMotion equivalent; HealthKit is not needed.
- **Weight manual, default goal "maintain" (D-055).**
- **Own SVG charts (D-056):** no large chart library, one small dependency (`react-native-svg`).
- **Running (D-057):** same filter thresholds as the validated legacy algorithm, new version name `lockedIn-rn-gps-v3`, elevation shown as "–".
- **Backup format (D-058):** old backups import; new backups carry `schemaVersion: 2`; a recovery snapshot is stored before an import replaces data.
- **Rest timer cues (D-059):** haptics, short speech and a local notification; no Live Activity.
- **Achievements computed, not stored (D-060):** always consistent with hidden/deleted history.

Smaller choices without a decision number:

- Elevation and Live Activity are documented gaps, as the work order says.
- The `Progress` tab drops Steps as a category (D-014); steps appear on the Dashboard, in the Weekly Report and under Goals.
- Body weight for a new workout: latest visible weight entry, else the manual value in Goals.
- The 10-second staleness check of GPS samples is applied relative to the newest sample of a batch, because background delivery can batch samples. Not verified on device.
- A run checkpoint is written at most every 15 seconds and restored only within 12 hours. After a restore, seconds without location are lost and the calculator does not bridge the gap; wall-clock time still counts as active time.
- The legacy `PlanCatalogMigration` and Polar-era run fields were dropped.

## Known gaps

- **Live Activity and lock-screen controls (Running and Training):** not built. Pause and end are in the app only.
- **Elevation gain/loss:** not computed (Issue #19). Raw altitude is stored per GPS point.
- **Route map (D-044):** only the data foundation (raw points, GPX export). No map UI.
- **Bluetooth scale import:** not built.
- **Muscle-group coverage and aggregation (D-046, D-047):** the library carries the muscle data; no UI yet.
- **HealthKit:** not used.
- **Design:** the Dashboard follows D-050 but no design direction has been chosen. Progress, Weekly Report and Running screens use the same tokens and simple layouts and have not been design-reviewed.
- Weight history can hide or add entries but not edit a value (correct by adding a new entry and hiding the old one).
- No web persistence: the web preview resets on every reload (demo data). Do not judge saving on the web.
- Weekly Report auto-opens on every web reload because settings are not persisted there.

## Please check on the iPhone

Work through this list in order. Each item names what could not be verified here.

1. **Install and Metro:** install the newest build (below), start Metro on the PC, open the Dev Client. Check that the app starts and that the loading spinner turns into the Dashboard. (SQLite opens the database at start.)
2. **First start data:** the "Full Body" plan should exist (Settings > Trainingspläne). The Dashboard should be empty but not broken.
3. **SQLite persistence:** log a weight, force-quit the app, reopen. The value must still be there. Same for a plan edit.
4. **Workout:** start a workout, save sets, watch the rest timer, lock the phone during a pause and see whether the "Pause vorbei" notification arrives. Check haptics and the spoken cue with sound on and off. Kill the app in the middle of a workout and reopen: the Dashboard should offer "Workout fortsetzen".
5. **Alternatives, skip, revisit:** switch an exercise, skip one, jump back through the overview list.
6. **Steps:** Goals > Schritte vom iPhone > An. Allow motion access. The Dashboard step number should match the Health/Fitness app for today. Check that today's partial value does not change the average of completed days.
7. **Running, foreground:** start a short run outside. Check the GPS accuracy line, distance, pace, spoken km cue (walk about 1 km or use a bike), pause/resume.
8. **Running, background:** start a run, lock the screen, put the phone in a pocket and run 1-2 km. This is the main risk (background location through the Expo task). Compare distance with another app or watch. The blue status bar location indicator should be visible.
9. **Run checkpoint:** kill the app during a run, reopen, choose "Lauf fortsetzen".
10. **Backup file access:** Settings > Daten & Backup. Create a backup and share it to Files. Restore it (this replaces data). Try the automatic backup folder in iCloud Drive and check that `Latest.json` appears after finishing a workout. Folder access for a saved location is the least certain part.
11. **Legacy backup import:** export a backup from the legacy app and import it. Check workouts, runs, weights, plans and GPX export of an old run.
12. **Notifications permission** prompt appears once, on the first rest timer.

If something breaks on the phone, note the screen and what you did; the fix is the next work item.

## How to install the latest build

- SideStore source: `https://github.com/Dvget/locked-in-v2/releases/latest/download/source.json` (see [SETUP_LOG_2026-09-19.md](SETUP_LOG_2026-09-19.md)). Install or update "LOCKED IN 2" (`app.lockedin.v2`). After a new build appears, pull down in Sources to refresh.
- The repo must stay public for the source to work (free Actions minutes and public release files).
- Start Metro on the PC for the Dev Client: `npx expo start --dev-client --clear` in `app/`.
- Native dependencies were added in this rebuild (`expo-sqlite`, `react-native-svg`, `expo-location`, `expo-task-manager`, `expo-sensors`, `expo-speech`, `expo-file-system`, `expo-document-picker`, `expo-sharing`, `expo-haptics`, `expo-keep-awake`, `expo-notifications`), so the **old Dev Client will not work**: install the new build.
- Builds used in the rebuild: see the "Builds" line at the end of this file.

## Builds

Build 1 (native dependencies batch): run `35463599872`, success, release `build-4`.
Build 2 (adds `expo-notifications`): run `35465682107`, success (11 min 37 s), release `build-5` = "LOCKED IN 2 – Build 5", the current "Latest". Install this one.

Two builds of the five allowed were used in this rebuild. Later JavaScript-only changes need no new build, only Metro.
