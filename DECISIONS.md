# LOCKED IN V2 — DECISIONS

This file records explicit project decisions. Do not silently overwrite these decisions.

| ID | Status | Decision |
|---|---|---|
| D-001 | fixed | V2 is a separate project from the legacy SwiftUI app. |
| D-002 | fixed | Legacy remains available as a read-only reference/fallback unless explicitly changed. |
| D-003 | fixed | V2 gets a separate Obsidian vault/project brain. |
| D-004 | fixed | The vault is primarily an AI-readable brain/file store, not a user-facing dashboard system. |
| D-005 | fixed | The vault must be portable into a larger future second-brain vault. |
| D-006 | fixed | Core app behavior is local-first and offline-first. |
| D-007 | fixed | No custom backend/account system is planned. |
| D-008 | fixed | Additional recurring paid infrastructure/services are out of scope. |
| D-009 | fixed | Main product areas remain Dashboard, Training, Running, Progress, Weekly Report and Settings. |
| D-010 | provisional | Bottom navigation initially remains Dashboard / Progress / Settings. |
| D-011 | fixed | Workout and Running are started from Dashboard. |
| D-012 | fixed | Dashboard focuses on current/short-term state, roughly the last four weeks. |
| D-013 | fixed | Progress is the long-term/full-history analysis area. |
| D-014 | fixed | Steps are mainly a current-week/current-activity feature, not a major long-term Progress module. |
| D-015 | fixed | Weight supports automatic import where useful and manual entry as fallback. |
| D-016 | fixed | Goal direction may be lose / maintain / gain and should contextualize evaluation. |
| D-017 | fixed | Training plans support exercises, order, work sets, target rep ranges, rest times, workout type and alternatives. |
| D-018 | fixed | Target rep range is globally configurable and individually overrideable per exercise. |
| D-019 | fixed | Warm-up sets are not logged or included in progress/index calculations. |
| D-020 | fixed | During a workout, each exercise compares primarily against the last execution of that same exercise. |
| D-021 | fixed | Exercises can be skipped, revisited and edited during a workout. |
| D-022 | fixed | Alternative exercises must preserve their own exercise history and not corrupt progression logic. |
| D-023 | fixed | Rest timer starts after logging a work set and should support Live Activity, audio and haptic feedback. |
| D-024 | fixed | Audio cues are controlled within the relevant Training/Running mode, not global Settings. |
| D-025 | fixed | Running interaction is primarily hands-off after start, with lock-screen controls and optional concise audio cues. |
| D-026 | fixed | Weekly Report summarizes the past week, compares it with the previous week and contextualizes it in the longer-term trend. |
| D-027 | fixed | Gamification is light and achievement-based, inspired by Strava-style personal best recognition. |
| D-028 | fixed | Awards are only shown when actually earned; they are not forced after every workout/run. |
| D-029 | fixed | Personal bests/achievements should also have a persistent history/leaderboard view. |
| D-030 | fixed | Settings include Training Plans, Data & Backup, Goals and About LOCKED IN. |
| D-031 | fixed | Current backup/import/export behavior is retained initially; diagnostic tracking export remains available. |
| D-032 | fixed | Backup/restore and analysis/diagnostic export are separate concepts. |
| D-033 | fixed | The UI is dark-mode-first, clean, technical and modern. |
| D-034 | fixed | Icons should be simple and system-like. |
| D-035 | fixed | Animations are welcome when functional and polished, not decorative noise. |
| D-036 | fixed | Fast-use screens should minimize taps; analysis/configuration screens may be denser. |
| D-037 | fixed | Dashboard cards keep their current information role; small trend lines are allowed, full charts are not needed there. |
| D-038 | open for review | Final visual card style and color system remain undecided. |
| D-039 | provisional | Orange remains the LOCKED IN brand color. |
| D-040 | provisional | Running may use purple as a section accent. |
| D-041 | open for review | Training accent color is not yet decided. |
| D-042 | fixed | Large color-filled sections are not desired; color should mainly act as an accent. |
| D-043 | fixed | Future architecture should allow user-created custom exercises. |
| D-044 | future | Running route maps may be added later. |
| D-045 | future | A web dashboard/interface may be added later as a learning/extension project. |
| D-046 | future | Training plans may later visualize muscle-group coverage. |
| D-047 | future | Progress may later aggregate exercise progress by muscle group, without pretending to directly measure muscle growth. |
| D-048 | provisional | React Navigation (`@react-navigation/native`, `bottom-tabs`, `native-stack`) is used for the first V2 app scaffold. Not a final architecture decision; may be replaced (e.g. by Expo Router) after review. |
| D-049 | fixed | The legacy Polar AccessLink import and the Cloudflare Worker/token integration used for it are permanently discarded. They are not migrated to V2 and not re-implemented. Running data in V2 is to be solved later natively / through the app's own architecture (HealthKit feasibility still open, see ARCHITECTURE.md). |
