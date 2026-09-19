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
