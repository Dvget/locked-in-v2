# Screens and Flows

## Main navigation

Initial V2 assumption:
- Dashboard
- Progress
- Settings

Training and Running are launched from Dashboard.

Weekly Report is not a permanent main tab.

This navigation is provisional and may be reviewed after V2 design prototypes.

## Dashboard

Purpose: "Where am I right now?"

Time horizon: approximately the current week plus context from the last four weeks.

Expected information:
- workout count / quality for the current week;
- run count / quality for the current week;
- steps for the current week;
- weekly step goal and current average/context;
- weight trend;
- launch actions for Workout and Run.

Dashboard information density should remain low.

## Training plan management

A plan can define:
- exercises;
- exercise order;
- work sets;
- target rep range;
- rest time;
- workout type;
- alternative exercises.

Plan creation/editing may be accessible from Settings and from the workout selection/start flow, but both surfaces must use the same underlying data and logic.

## Active workout

Key behavior:
- show the current exercise;
- show the last performance of that same exercise;
- allow current weight/reps entry;
- compare current vs previous performance;
- allow skipping and revisiting exercises;
- allow editing mistakes;
- allow switching to stored alternatives;
- start rest timer after a logged work set;
- support Live Activity, concise audio cue and haptic feedback.

Warm-up sets are not logged.

A subtle progression hint may appear when a clear rule is satisfied, e.g. hitting the configured top of the rep range across all target sets.

## Workout completion

Show:
- duration;
- overall workout progress/index once defined;
- important progress;
- only genuinely earned achievements, ideally a small number of highlights.

## Active run

Typical behavior:
- start run;
- put phone away;
- use lock screen for pace/status/pause/end;
- optional audio cues;
- cues should be short enough to work while music is playing.

Example cue content:
- completed kilometer;
- pace for that kilometer;
- optionally current overall average pace.

## Run completion

Show:
- distance;
- average pace;
- splits/km breakdown;
- performance index/trend once defined;
- earned achievements/personal bests.

## Progress

Purpose: "How have I developed overall?"

Long-term analysis may include:
- strength/workout development;
- running development;
- weight development;
- personal best history;
- future muscle-group analysis.

Steps do not need to become a major long-term Progress module.

## Weekly Report

Includes:
- past-week summary;
- comparison with previous week;
- longer-term context;
- relevant standout achievements.

It should remain a report, not duplicate the entire Progress screen.

## Settings

### Training Plans
Create/edit training plans and their exercise configuration.

### Data & Backup
Backup, restore, export, import and diagnostic export.

### Goals
Potential goal context:
- lose / maintain / gain body weight;
- muscle-building intent;
- workouts per week;
- mixed body-composition intent.

Goals should provide context, not turn the app into an intrusive coach.

### About LOCKED IN
App version and relevant technical/data-source information.

## Onboarding (required, D-061)

The app needs an onboarding flow at first launch. The requirement is fixed; content is still open and is defined with the user, screen by screen, before it is built.

Candidate steps (not decided):
- Welcome and one-sentence promise (local, offline, no account).
- Goals: weight direction (lose / maintain / gain), workouts and runs per week.
- Body weight (used for bodyweight exercises and the weight trend).
- First training plan: start with the default plan, create one, or import a backup from the legacy app.
- Permissions explained where they matter: location and background location (runs), motion (steps), notifications (rest timer). Each with a short reason and a way to say "later".
- Where the backup lives and how to make one.

Rules: skippable where sensible, short, never blocks the fast-use layer afterwards, and the same settings stay editable later under Settings. The default plan currently seeded on first launch and the permission prompts that appear on first use are the interim behavior until this is designed.
