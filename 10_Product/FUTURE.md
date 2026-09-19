# Future Features

These are deliberately not required for the initial V2 build.

## Running route map

Potential Strava-like route visualization for completed runs.

Architecture should avoid making this unnecessarily difficult later.

## Web interface

Potential future web dashboard/interface.

Primary reason:
- useful extension;
- learning project for web development;
- possible additional analytics surface.

It is not a current requirement.

## Custom exercise creation

If an exercise is missing from the built-in catalog, the user should eventually be able to create one.

This should be anticipated in the data model.

## Muscle-group plan visualization

Potential view of a human-body diagram showing which muscle groups a plan focuses on.

Possible inputs:
- primary/secondary muscle mappings;
- exercise count;
- work-set volume;
- relative weighting by exercise.

## Muscle-group progress aggregation

Potential future analysis that aggregates the development of relevant exercises by muscle group.

Important semantic boundary:
Do not claim that an exercise-performance increase directly proves muscle growth.

Prefer language such as:
- chest-related exercises are progressing strongly;
- back-related exercises are stable;
- leg-related exercise performance has recently stagnated.

## External AI analysis

The app should be able to export data in a form that can later be given to an external AI for higher-level interpretation.

A built-in cloud AI coach is not required.
