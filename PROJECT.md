# LOCKED IN V2 — PROJECT

## Purpose

This file is the first source every AI/agent must read before working on LOCKED IN V2.

LOCKED IN V2 is a clean restart of the existing LOCKED IN fitness app. The project is primarily a private hobby/learning project. It should remain simple, fast, local-first, offline-first and free to operate apart from the user's already existing AI subscriptions.

The legacy SwiftUI app remains intact as a reference and fallback. V2 is a separate project.

## Product goal

LOCKED IN records and structures strength training, running, weight and activity data and makes progress easy to understand.

The app should:
- reliably record training data;
- show useful comparisons with previous performance;
- make complex data understandable without becoming a coaching app;
- support consistent training with evidence-informed indicators where they are clearly derivable;
- stay visually modern, simple and fast to use.

The app is not intended to become:
- a social network;
- a nutrition tracker;
- a cloud-account platform;
- an intrusive AI coach;
- a highly gamified badge/level system.

## User and collaboration context

The user is building this as a hobby and learning project and uses AI agents heavily for planning, implementation and review.

Assume:
- the user understands the product deeply;
- the user can follow technical architecture and implementation discussions;
- the user is learning app development and does not want unnecessary jargon or basic tutorials unless requested;
- important technical trade-offs should be explained clearly and compactly.

## Communication rules

All AI agents working on this project must:

1. Be concise and direct.
2. Analyze first; recommend an action only after the relevant trade-offs are understood.
3. Do not reflexively agree with the user.
4. Call out contradictions, risks and unclear assumptions immediately.
5. Do not invent requirements or silently turn ideas into decisions.
6. Distinguish clearly between:
   - `fixed`
   - `provisional`
   - `open for review`
   - `rejected`
7. Ask focused questions when a decision is genuinely missing.
8. Avoid huge conversation simulations, long motivational framing and unnecessary repetition.
9. Preserve already validated behavior unless there is a concrete reason to change it.
10. Keep the project simple. Complexity requires a clear benefit.

## Project principles

### Cost
No additional recurring paid infrastructure or service should be required for the project.

### Local-first
Personal fitness data should live locally on the iPhone and/or in the user's own iCloud storage. No proprietary backend is planned.

### Offline-first
Core app functionality must work without an Internet connection.

### Data ownership
The user must be able to back up, export, restore and inspect their own data.

### Manual fallback
Where automation exists, manual input should remain possible when practical.

### Evidence-informed, not coach-driven
The app may surface subtle evidence-informed indicators, but the user remains in control.

### Simplicity
Fast everyday use is more important than exposing every possible configuration on every screen.

## Two UX layers

LOCKED IN has two interaction modes:

1. **Fast use**
   - Dashboard
   - Active workout
   - Active run
   - very few taps
   - critical information immediately visible

2. **Deep analysis/configuration**
   - Progress
   - Training-plan editing
   - Data/backup
   - Goals
   - richer information and more controls are acceptable

Do not mix these layers unnecessarily.

## Source-of-truth hierarchy

When files disagree, use this order:

1. `PROJECT.md` — project constitution and collaboration rules
2. `DECISIONS.md` — explicit product/project decisions
3. `STATUS.md` — current state and immediate priorities
4. Domain documents in `10_Product`, `20_Design`, `30_Technical`, `40_Migration`, `50_Validation`
5. Legacy repository / legacy vault — reference only unless explicitly promoted into V2
6. Old chats or informal notes — context only

## Documentation rules

- A meaningful decision must not remain only in chat.
- Stable decisions go into `DECISIONS.md` and the relevant domain document.
- Current work and next steps go into `STATUS.md`.
- Open questions stay explicitly marked open.
- Do not create duplicate truth in multiple files unless one location links to the canonical one.
- Do not turn the vault into a UI/dashboard/plugin project. It is primarily an AI-readable project brain and file store.
- Prefer plain Markdown and relative links.
- Keep assets inside this project tree.
- Avoid dependence on vault-specific plugins or absolute filesystem paths.

## Legacy boundary

The legacy app and old Obsidian workspace are reference material.

Default rule:
- Legacy: READ ONLY
- V2: writable

Do not modify legacy code, legacy project state or legacy vault files unless the user explicitly requests it.

## Startup sequence for AI agents

Before doing substantial V2 work:

1. Read `PROJECT.md`.
2. Read `STATUS.md`.
3. Read `DECISIONS.md`.
4. Read `INDEX.md`.
5. Read only the domain files relevant to the task.
6. If migration/behavior parity matters, consult `40_Migration/LEGACY_REFERENCE.md` and the legacy repository.

## End-of-task rule

After substantial work, update the project brain if the work changed:
- a decision;
- project status;
- technical assumptions;
- validation findings;
- migration status;
- open questions.
