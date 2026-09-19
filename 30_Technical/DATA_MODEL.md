# Data Model

## Status

Preliminary. Final schema is not yet decided.

## Principles

- use stable IDs;
- preserve historical records independently from current configuration;
- avoid mutating old workout history when plans/exercises are edited later;
- support user-created exercises;
- support export/restore;
- allow future web/read-only analytics without redesigning core concepts.

## Likely entities

### Exercise
Potential fields:
- stable ID;
- name;
- exercise type;
- equipment;
- primary muscle groups;
- secondary muscle groups;
- built-in vs user-created;
- optional metadata.

### Training Plan
Potential fields:
- stable ID;
- name;
- workout type;
- ordered exercise references;
- plan-level defaults.

### Plan Exercise Configuration
Potential fields:
- exercise ID;
- order;
- work-set count;
- target rep range;
- rest duration;
- alternative exercise IDs;
- exercise-specific overrides.

### Workout Session
Historical immutable-ish record of a completed/in-progress workout.

### Exercise Performance
Historical sets/reps/load tied to a workout session and exercise ID.

### Run
Historical running record with route/tracking samples as needed.

### Weight Entry
Manual or imported weight measurement, with source metadata.

### Step Summary
Imported/derived daily or weekly activity data.

### Goal Configuration
Current goal context, not necessarily a historical coaching plan.

### Achievement
Derived or persisted personal-best/award record.

## Open modeling questions

- exact muscle-group weighting model;
- whether achievements are fully derived or partly persisted;
- exact run sample storage;
- exact index storage vs recalculation;
- versioning/migration strategy for JSON backup.
