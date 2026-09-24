# Design References

## Strava chart reference

A Strava screenshot (Running, "Diese Woche") was provided as a visual reference. The image file is kept only locally in `20_Design/References/` and is deliberately **not** stored in Git. This text is the durable description.

What the screenshot shows (top to bottom):

- Very dark, almost black background. Content sits in dark charcoal cards with large rounded corners. No shadows; depth comes from the tone difference between background and card.
- Top of the first card: two outlined "pill" filters, "Alle Sportarten" (neutral grey outline) and "Lauf" (orange outline and orange text, selected).
- Heading "Diese Woche", then a compact row of three KPIs: Distanz 6,06 km, Zeit 39min 1s, Höhenmeter 89 m. Small grey labels above, white semi-bold values below. The numbers are clear but not huge.
- Line chart "Letzte 12 Wochen": one orange line with clearly visible round points, a subtle dark-orange gradient under the line, only two thin horizontal grid lines (8 km, 16 km) and very few axis labels (months JUL / AUG / SEP at the bottom, km on the right). The current week is marked by a white vertical line with a larger highlighted point.
- Below the chart, a full-width outlined button: "Erfahre mehr über deinen Fortschritt" (white text, thin grey border).
- Second card "Serie": a large orange flame with the number 5 and the label "Wochen", and to the right a small dot grid of the month (grey dots, a few white ones for active days). "Dieser Monat" with a chevron at the top right.

Useful characteristics for LOCKED IN:
- dark neutral background;
- slightly lighter cards rather than strong shadows;
- orange used as an accent rather than a large color block;
- clear line and large points;
- subtle area fill;
- restrained labels;
- compact KPI row;
- simple outlined controls.

This is a reference for design qualities, not a requirement to copy Strava.

## Inspiration 2: "GOD MODE" GitHub-card thumbnail (added 2026-09-20)

Source: a video thumbnail the user liked, shared in chat. Local file: `20_Design/References/inspo-02-god-mode-github-cards.png` (git-ignored, visible in Obsidian only). The user said this way of presenting things appeals to them a lot. It is about mood and card style, not a fitness screen.

What it shows:

- Near-black background with a very subtle grain and a warm orange glow rising from the lower left. The glow is soft and localized, not a color fill.
- Huge, heavy, white sans-serif headline ("GOD MODE") with two of the letters replaced by symbols: an orange starburst and the GitHub logo. One strong typographic gesture, no other decoration.
- Below it, a fanned stack of dark charcoal cards in slight perspective. They overlap; cards further back are dimmer and smaller, which creates depth without shadows.
- Card anatomy (front card): rounded corners (about 16 to 20), thin subtle border, a solid orange rounded-square icon tile with a white glyph on the left, a small grey lowercase org label above a bold white name, a stat row with an orange star and a bold number plus a grey fork icon and a grey number, then two grey skeleton bars as placeholder text. A small light grey logo sits in the top right corner.
- Palette is only: near-black, charcoal, white, mid grey and ONE orange accent. Orange appears in the glow, the icon tile, the star and the headline symbol.

Useful characteristics for LOCKED IN:

- one accent color with a clear role, everything else neutral (answers the "colors are not consistent" problem);
- big confident type for the one thing that matters, small grey labels for the rest;
- cards defined by tone and a hairline border, depth by overlap and dimming instead of shadows;
- a compact stat row pattern (icon + bold number, then grey secondary number) that could fit workout or run summaries;
- a soft localized glow as the only "effect", possibly for the start card or a completed-workout moment;
- an accent-filled icon tile as the single strong element on a card (similar to the current start card tile).

Caution: it is a marketing image, so density and text sizes are exaggerated; real screens need smaller type and more data.

## Inspiration 3: GymMane (open-source gym app, added 2026-09-24)

Source: https://github.com/InlitX/GymMane (Flutter, Android, offline, no account; about 570 stars). Screenshots of Home, Session, Progress and Train were downloaded to `20_Design/References/gymmane/` (git-ignored, local only).

**License warning:** the code is GPL-3.0 and the exercise art is CC BY-SA 4.0. Our repo is "all rights reserved", so **no code or art may be copied** into LOCKED IN. Ideas, layouts and behavior can inspire us; everything is rebuilt in our own words and code.

Why it is relevant: same philosophy as LOCKED IN (local-first, offline, no account, no costs, D-006 to D-008) and a calm, non-generic look.

### Look (what makes it not feel like "AI slop")

- **Almost monochrome.** Background near-black (`#0A0A0A`), cards one step lighter (`#1C1C1C`), a second level (`#2B2B2B`), hairline border (`#3E3E3E`). Text white / grey `#9A9A9A` / dark grey `#666666`.
- **The primary action is white, not colored.** "Start workout" is a big white pill with black text. The play button in the tab bar uses the warm accent.
- **One muted warm accent** (copper `#D9A184`) plus a muted sage green (`#8FA377`) only for "done" states (checked sets). Warning and danger colors exist but are rare. No saturated neon orange, no purple.
- **Hierarchy through type, not color.** Tiny uppercase grey labels ("TODAY'S ROUTINE", "VOLUME"), big bold white numbers (`28.8 t`, `2:30`), a large clean title per screen.
- **Soft extras only:** subtle dot grid on the background, one big faint circle and a line illustration inside the hero card, a warm glow. No gradients on every card.
- **Floating bottom bar** with a raised round play button in the middle (start is always one tap away).

### Screens worth noting

- **Home (Today):** date as title, a hero card "Today's routine: Push, 4 exercises" with a white "Start workout" button, a week row Mo to So with filled check circles for trained days, "This week" KPI card (volume, sets, PRs, goal ring 4/4), activity heatmap.
- **Live session:** status "IN PROGRESS" with elapsed time and pause at the top; "EXERCISE 1 OF 4" with a **segmented progress bar** (one segment per exercise) and an "All" list button; exercise name plus a muscle tag; **one compact line "LAST 90×8 · 90×8 · 92.5×6" and one line "NEXT 92.5 kg × 8 · same weight until you hit every rep"**; exercise illustration; rest block with −15 / +15, a tick bar that empties, big `2:30`, "TAP TO SKIP", elapsed time and "2/12 sets"; below, **all sets of the exercise as a table** (reps − n +, weight − n +, check circle), done rows tinted green.
- **Progress:** small cards with a number and a mini line (Volume 30 days with +16 %, Weight), a consistency heatmap with streak, three KPI tiles (sessions, sets, time), a muscle map with 7D / 30D / Recovery.

### Ideas for LOCKED IN (not decided, to discuss in the screen-by-screen review)

- Design direction candidate: **monochrome + one accent + white primary button** would directly fix "colors are not consistent" (D-038, D-041). Our brand orange (D-039) could take the accent role, used much more sparingly.
- Active workout: show **all sets of an exercise as a table** instead of one set at a time; "LAST" and "NEXT" as two compact lines (our progression hint fits the "NEXT" line); segmented progress bar per exercise.
- Home: **week row Mo to So** with done markers; a single hero start card.
- Onboarding (D-061): their flow is a good pattern. Welcome with one promise line ("Alles bleibt auf deinem Handy. Kein Konto, kein Internet, nichts zu bezahlen."), then numbered steps "SCHRITT x VON n", each with one question and **one short "why" line** (for example "Legt deinen wöchentlichen Zielring fest. Sei ehrlich, nicht ehrgeizig."), a skip button on every step. Their steps: name, units (kg/lb), body numbers, weekly goal, places and equipment.
- Features seen there that we do not have (only candidates): import from Hevy / Strong / CSV, set types (warm-up is excluded by D-019, but drop set / to failure), supersets, plates per side calculator, rest countdown as live notification, activity heatmap and streak, body measurements, progress photos, muscle map (relates to D-046 / D-047), home-screen widgets.

## Rule for images

Screenshots and other reference images stay in the local Obsidian folder only (`20_Design/References/` is git-ignored). Anything important about an image is written down as text in this file.
