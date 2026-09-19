# Architecture

## Status

**Open for design after feasibility proof.**

Do not treat React Native / Expo as final until the required workflow and native capabilities are proven.

## Architectural constraints

- local-first;
- offline-first;
- no custom backend;
- no account system;
- free operation;
- iPhone is the primary target;
- data backup/export must remain under user control;
- future web UI should not be made impossible;
- future custom exercises and muscle metadata should be possible.

## Preferred development direction under evaluation

Windows-first React Native + Expo.

Desired workflow:
- edit on Windows;
- immediate web preview where useful;
- Expo/Metro development loop;
- physical iPhone Dev Client for real iOS behavior;
- Fast Refresh without rebuilding IPA for JS/TS/UI changes;
- GitHub/macOS used only where native iOS build is necessary;
- SideStore/free Apple-account signing workflow if technically viable.

## Proof status (2026-09-19)

Details: [60_Workflow/SETUP_LOG_2026-09-19.md](../60_Workflow/SETUP_LOG_2026-09-19.md)

Confirmed:
- local development on Windows;
- Expo Web preview;
- Metro (including `--dev-client` mode);
- Claude works directly on local code.

Still open:
- unsigned Dev Client IPA;
- SideStore installation;
- real iPhone Fast Refresh;
- native iOS features.

## App scaffold (2026-09-19, provisional)

Minimal navigable structure under `app/src`, no feature logic yet:

```
app/App.tsx                  SafeAreaProvider + RootNavigator
app/src/navigation/          RootNavigator (native stack), TabNavigator (bottom tabs)
app/src/screens/             Dashboard, Progress, Settings, Workout, Running, WeeklyReport
app/src/components/          Screen, Card, PlaceholderScreen
app/src/theme/               colors, spacing, radius (minimal, not a design system)
app/src/types/               navigation param lists
```

- Navigation: React Navigation v7 (provisional, D-048).
  - Bottom tabs: Dashboard / Progress / Settings (D-010).
  - Root stack: Tabs, Workout, Running, WeeklyReport. Workout, Running and Weekly Report are opened from Dashboard; Weekly Report is not a tab.
- Dependencies added: `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`, `react-native-screens`, `react-native-safe-area-context`. The last two contain native code, so a native Dev Client rebuild is needed for them.
- Visual state is placeholder only; card style and colors remain open (D-038, D-041). Orange is used only as an accent (active tab).
- Not yet included: state management, persistence, charts, icons, HealthKit, workout/running logic.
- Verified: `tsc --noEmit` passes; Expo web export succeeds; in the web preview all six screens are reachable and all three tabs switch. No native iOS build was run.

## Native capabilities that must be proven

- background location/running;
- HealthKit;
- Live Activities/app extension;
- lock-screen controls where applicable;
- audio cues;
- haptics;
- local persistence;
- backup/export/import;
- sensor/data access needed for steps/weight workflows.

## Architecture rule

Do not recreate legacy architecture for familiarity alone.

Port validated behavior and data semantics, then choose V2 architecture based on the new stack.
