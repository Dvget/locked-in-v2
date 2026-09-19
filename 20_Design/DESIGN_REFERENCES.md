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

## Rule for images

Screenshots and other reference images stay in the local Obsidian folder only (`20_Design/References/` is git-ignored). Anything important about an image is written down as text in this file.
