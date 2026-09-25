# AI Workflow

## Purpose

This project brain exists so multiple AI systems can work on LOCKED IN without depending on old chat history.

## Before work

Read:
1. `PROJECT.md`
2. `STATUS.md`
3. `DECISIONS.md`
4. `INDEX.md`
5. only relevant domain files

If the task touches legacy behavior, also read the relevant legacy source.

## During analysis

- separate facts from assumptions;
- mark open questions explicitly;
- do not silently promote an idea into a requirement;
- compare alternatives before recommending a direction;
- keep the user's cost and simplicity constraints visible.

## During implementation

- V2 is writable;
- legacy is read-only unless explicitly authorized;
- avoid unrelated refactors;
- preserve validated behavior;
- update tests/validation when behavior changes.

## After substantial work

Update only what changed:

### Decision changed
Update:
- `DECISIONS.md`
- relevant domain file

### Current priority/state changed
Update:
- `STATUS.md`

### Validation result changed
Update:
- corresponding file in `50_Validation`

### Technical architecture/data model changed
Update:
- corresponding file in `30_Technical`

### Migration state changed
Update:
- `40_Migration/MIGRATION.md`

## Handoffs

A new AI should not need a transcript dump.

The project files should answer:
- What is LOCKED IN?
- What has already been decided?
- What is still open?
- What is being worked on now?
- What is authoritative?
- What must not be changed?

## Several chats at the same time (lessons, 2026-09-19 to 2026-09-25)

- One chat owns the code in `app/`. Another chat may own docs or design, but two chats never edit the same files.
- Commit only your own files with explicit `git add <paths>`; check `git status` first. If a push is rejected, `git pull --rebase` and push again.
- When a chat gets long (about 60 to 70 % of the context window) or a work block ends: update `STATUS.md` ("Next steps"), then continue in a fresh chat that starts by reading the project files.

## Unattended (autonomous) runs

- Before walking away, set the chat's permission mode to **Auto**. "Accept edits" only covers file changes; every shell command still asks for approval (more than 25 prompts were observed in one rebuild).
- Keep shell commands simple: one command per call, no `$(...)`, no chained `&&`, no heredocs; use the file tools (see `AUTONOMOUS_REBUILD.md`).
- Builds are free only while the repo is public (private repos: 2,000 Actions minutes per month on the Free plan, exhausted in September 2026).

## What agents can see (privacy)

- Agents see the project folder, GitHub and whatever the user shows in chat. They never see the user's real training data. It lives on the iPhone; the legacy app does not sync via iCloud (CloudKit is off). An optional automatic backup JSON goes to an iCloud Drive folder the user chose. V2 works with demo and seed data; real data reaches V2 only through a backup import on the phone.
- The repo is public for free builds: no images, no secrets, no private email (use the anonymous GitHub address), no home network addresses in files or commits. The legacy repo was once public; its history contains the private email and an old, unauthenticated Polar worker URL (the server is gone). Details: `SETUP_LOG_2026-09-19.md`.

## Communication and design work

- Explain in plain German, short: what happened and what it means first, technical terms in one sentence. Where a work order says "no questions", pick the simplest default and record it instead of asking.
- Design variants are explored on the Claude Design canvas (390×844 boards, real content, one board with the current state as reference). Base variants on the tokens read from the legacy code, never on placeholders. The canvas lives at claude.ai; findings go into `20_Design/DESIGN_FINDINGS_*.md`; images stay out of Git.
