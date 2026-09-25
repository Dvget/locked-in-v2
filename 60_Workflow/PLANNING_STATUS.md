# Planung — status and handoff

Handoff file of the **Planung** chat (design, ideas, tools, workflow). Rules: `AI_WORKFLOW.md`, section "Two standing chats". The Coding chat uses `STATUS.md`. Keep "Next" current; a new Planung chat starts here.

## Current state (2026-09-25)

### Design

- No direction chosen yet (D-038, D-041 open). The user finds the current look generic ("AI slop"): too many accent colors without clear roles, every element the same rounded card, no type hierarchy.
- References described in `20_Design/DESIGN_REFERENCES.md`: (1) Strava chart, (2) "GOD MODE" GitHub-card thumbnail, (3) GymMane (open-source offline gym app, GPL-3.0: ideas only, never copy code or art). Images stay local in `20_Design/References/` (git-ignored).
- Canvas 1 (legacy rebuilt + four directions, none chosen): link in `20_Design/DESIGN_FINDINGS_2026-09-19.md`.
- **Canvas 2** "LOCKED IN · Design-Richtungen": https://claude.ai/artifact/WeGiAQGrZVE4vGH52aJi5T. Row 1 = current app, row 2 = proposal "near black and white, one accent, white primary button, hierarchy by type" (Dashboard, active workout with set table, onboarding step 2). Accent is a tweak: brand orange, copper, sage, off-white. **Waiting for the user's feedback.**
- Inspiration sources: Mobbin MCP needs a paid plan (about 10 to 15 USD/month); free route for now: the user sends screenshots (App Store screenshots, Screenlane, UX Archive), they are described as text.

### Ideas

- Onboarding is required (D-061); content open. Candidate steps and rules: `10_Product/SCREENS_AND_FLOWS.md`, section "Onboarding". GymMane's pattern (step counter, one question, one "why" line, skip) is a good model.
- Feature candidates seen in GymMane (none decided): import from Hevy/Strong/CSV, supersets, plates-per-side calculator, activity heatmap and streak, body measurements, muscle map (D-046/D-047), rest countdown as live notification, week row Mo to So on the dashboard, all sets of an exercise as a table in the live workout.

### Tools and workflow

- Two standing chats (this one and Coding), see `AI_WORKFLOW.md`.
- Obsidian Web Clipper saves text and image links, not the look; clip into `20_Design/References/` (git-ignored) if used.
- Other sessions can be read from a chat via the session tools, but each chat should save its own state.

## Proposals for the Coding chat (need the user's OK first)

- none open

## Next

1. Collect the user's feedback on canvas 2; if wanted, add a second direction next to it.
2. With 3 to 5 more reference apps from the user, write a short design rule sheet (colors and their roles, type scale, card and button styles, chart style) as a proposal.
3. Draft the onboarding flow screen by screen as a proposal (D-061).
