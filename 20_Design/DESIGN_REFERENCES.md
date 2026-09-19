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

## Rule for images

Screenshots and other reference images stay in the local Obsidian folder only (`20_Design/References/` is git-ignored). Anything important about an image is written down as text in this file.
