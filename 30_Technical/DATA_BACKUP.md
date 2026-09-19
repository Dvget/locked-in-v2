# Data, Backup and Export

## Initial V2 requirement

Retain the useful behavior of the current app before redesigning the system.

Current functional concepts to preserve:
- automatic backup;
- choose/change backup folder;
- create/select backup folder;
- forget/disconnect backup folder;
- export a JSON backup;
- import a JSON backup;
- export tracking data separately.

## Separation of concerns

### Backup/restore
Purpose:
- preserve the user's complete app state/history;
- restore the app.

### Diagnostic/analysis export
Purpose:
- inspect running/tracking behavior;
- analyze raw/derived data;
- support development validation;
- later enable external AI analysis.

These are not the same format or use case and should remain conceptually separate.

## Current diagnostic priority

Tracking-data export remains useful while validating Running Mode, especially elevation processing.

The final export structure can be redesigned later.
