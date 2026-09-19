# Design findings — 2026-09-19

Result of the first design exploration with Claude Design (a canvas with the legacy Dashboard rebuilt from code, four new directions and one improved version of the legacy look). The canvas itself lives at claude.ai (private page, not in Git): https://claude.ai/artifact/CzvcrFm6xi8n6Xq6PXyTeZ. This file is the durable record.

## What the user said

- The legacy UI is not bad; a lot of thought went into it. The goal is to **improve it, not replace it**.
- All four new directions and the improved original contain good elements, but **none convinced the user yet**. No variant is chosen.
- The user likes the Claude Design feature itself and wants findings to be recorded here so the rebuild uses them.

## Canonical design tokens (read from the legacy SwiftUI code)

Use these in V2. They replace the placeholder values that Dashboard V1 used (`#ff7a1a`, `#9d7bff`, `#1c1c1e` were not taken from the legacy app). D-039 says orange stays the brand color: it is the legacy orange.

| Token | Value | Legacy source |
|---|---|---|
| Brand / Workout orange | `#FC4C02` | `LITheme.swift` (`brandOrange`, `workoutOrange`) |
| Running purple | `#8C57F5` | `runningPurple` |
| Positive / steps green | `#8CDB4F` | `lockedGreen`, `semanticPositive` |
| Caution / negative | system yellow / system red | `semanticCaution`, `semanticNegative` |
| Weight / neutral accent | white at 78 % | `weightBlue` |
| Background | black `#000000` | |
| Card surface | `#131316` (0.075, 0.075, 0.085) | `lockedSurfacePrimary` |
| Secondary surface | `#1C1C20` | `lockedSurfaceSecondary` |
| Card border | white at 5 % | `UIConsistencyPresentation.cardBorderOpacity` |
| Card radius / padding | 20 (continuous corners) / 16 | `cardCornerRadius`, `cardPadding` |
| Screen padding / spacing | 16 / 14 (Home: 14 horizontal, 10 between items) | `screenHorizontalPadding`, `screenSpacing`, `HomeView` |
| Icon tile | 62×62 radius 16 (category cards), 54×54 radius 14 (compact cards); fill = accent at 9 % | `TrackingCategoryCard`, `HomeCompactNavigationCard` |
| Start card (Home) | 92 high, gradient from accent at 22 % (left) to card surface (right), border accent at 22 %, radius 20, icon tile 54 solid accent with black play glyph | `HomeSessionActionCard` |
| Category cards (Home) | 132 high; caption label (uppercase, secondary), primary value bold ~22 pt, secondary line ~15 pt | `TrackingCategoryCard` |
| Weight card (Home) | compact, 92 high | `HomeCompactNavigationCard` |
| Footer | black, icons only (no labels), icon size 38, active = orange, never a global tab-bar inset hack | `RootView`, PROJECT_STATE "Footer hard rule" |
| Header | logo mark (orange) + "LOCKED" (white, 12 pt semibold, tracking 2) + "IN" (orange, tracking 1.6), centered | `LIBrandHeader` |

Device-confirmed in the legacy app (Build 60): the accepted element and chart heights must stay stable; scrolling is allowed but must not change them. Desired but still open there: back buttons tinted per section (Workout orange, Runs purple, Steps green, Weight neutral).

## What was explored

| Board | Idea | Good elements worth keeping as candidates |
|---|---|---|
| Original (rebuilt from code) | reference | the baseline |
| Original improved | keep everything, add: Workout and Run start cards side by side in the same style (D-011), small trends inside the cards (D-037), weight shows value and 4-week change, new "Wochenbericht" card (D-026), new "Letzter Erfolg" card (D-027) | closest to the legacy look, lowest risk |
| A · Original-like | legacy colors and cards, two start tiles, week summary card | week summary row |
| B · Technical | thin outlines instead of filled cards, monospace numerals | monospace tabular numbers for KPIs, dotted grid lines in charts |
| C · Weekly goals | progress rings toward weekly goals, steps progress bar | goal rings, steps progress toward a weekly goal |
| D · Compact list | one row per area with an inline mini trend | fast scanning, inline mini trends |

## Working rules for the rebuild

1. Keep the legacy look as the base: tokens above, card form, spacing, footer, hierarchy.
2. Apply V2 changes conservatively: D-011 (Run and Workout start from Dashboard), D-037 (small trend lines only), D-026, D-027, D-042 (color as accent, no large filled areas).
3. Until the user picks something else, build the Dashboard after "Original improved". Keep all colors and sizes central in `src/theme` so a later restyle is cheap.
4. Do not invent a new visual language without the user's choice.

## Open design questions

- Which specific elements did the user like in which variant? (To ask.)
- Steps color: green as in the legacy app, or neutral (V2 working hypothesis).
- Do the Dashboard cards keep opening detail screens, or does Progress take over?
- Weight tone should follow the goal direction (D-016).
- Progress and Weekly Report designs are not explored yet. The legacy Weekly Report (Build 60) was rejected on device (Issue #31).
- Real screenshots of the legacy app would improve fidelity. The user can show them in chat; they are described here in text and never committed (no images in Git).

## Process notes for the next design round

- Use the Design canvas: 390×844 boards side by side, real content, one board for the current state as reference.
- Fidelity lesson: base variants on the tokens read from the legacy code, not on V2 placeholder values.
- Change a canvas only after reading its current files; the user edits it live.

## Legacy screen descriptions from real renders (added during the rebuild)

Source: the legacy UI-preview workflow renders (`home.screen`, `dashboard.workouts.screen`), downloaded from GitHub Actions artifacts and viewed locally. Images are not committed.

**Home:** centered header with orange "LI" mark, then "LOCKED" (white, letter-spaced) and "IN" (orange). Below: start card (92 high, orange gradient from the left fading into the card, orange border, solid orange 54 tile with black play glyph, title "Workout starten" bold ~24, orange chevron right). Then category cards (132 high, 62 tile with accent at 9 %, caption uppercase grey, value bold ~26 in traffic-light green such as `2 / 2` or `Ø 9.670`, detail line ~15 in green or grey, chevron in the accent). Then a compact "Gewicht" card (92 high, grey tile with weight glyph, title only). Footer: black, filled house (active, orange), chart, gear; no labels; hairline above.

**Workouts detail (legacy, now folded into Progress > Training per D-052):** centered title. One large card: caption "LETZTE 4 WOCHEN", a two-part switch (Index | Gesamtgewicht, selected = grey pill), left caption + very large orange value (`120,4`), right caption "4-WOCHEN-TREND" + large green percentage, then a plain line chart with round dots, horizontal grid lines, value labels on the right (100,0 / 105,0 ...) and three date labels below. Second card: two columns (Index, Gesamtgewicht) with white value and green change. Then a full-width orange button "Workout nachtragen" and two dark buttons side by side ("Übungen", "Verlauf") with leading glyphs.

V2 status: Home and the Progress Training card follow these descriptions. "Workout nachtragen" (manual workout entry) is not built.

## Design inspiration track (2026-09-20)

The user does not like the current look (colors are not applied consistently, no direction chosen). Plan: finish functionality screen by screen first, collect inspiration in parallel, then decide a direction and restyle (colors and sizes are central in `app/src/theme` and `app/src/components`).

Inspiration source under consideration: the Mobbin MCP connector (search of real app screens, flows and sections). It requires a paid Mobbin plan (reported about 10 to 15 USD per month depending on billing period; verify on their pricing page, which could not be fetched automatically). It is a design tool for the user, not app infrastructure, so it does not conflict with D-008, but it is the user's call. Alternatives: the user collects screenshots of apps they like and shows them in chat (they are then described as text here, never committed). Candidate apps to look at: Strava, Apple Fitness, Hevy, Strong, Whoop, Nike Run Club, Oura. Screen types to cover: dashboard, active workout, active run, progress/charts, onboarding (D-061).
