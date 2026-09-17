# Project review and repairs

Reviewed the application routes, shared Redis model, session/group controls, scheduling and push delivery, browser notification/audio paths, forms, history, and tests. Existing crop/preset/half-hour controls were already in the checked-out frontend; deployment must contain this revision to display them.

## Findings fixed

- P1: Alarm edits and scheduling completion could overwrite a concurrent cancellation. Redis now compares both revision and lifecycle before committing updates.
- P1: A missing push/scheduler setting also prevented reading the schedule because session signing and Redis access required every environment variable. Those operations now validate only their own required settings. Scheduling still validates the complete alarm configuration.
- P2: Schedule loading issued one HTTP request per alarm, including historical entries. Reads now use bounded MGET batches and prune obsolete index entries. Redis requests also have a timeout.
- P2: Delete controls were exposed to members the server would reject, and the dashboard swallowed the resulting error. Controls now match creator/admin permissions and failures are visible. New group creators receive the existing admin role. Existing member sessions are not silently promoted.
- P2: PATCH existed without frontend access. The schedule now exposes edit/reschedule; crop editing explicitly warns that it replants and restarts the countdown. Failed schedules can be rescheduled through that form.
- P2: Push status was lost on reload. The device subscription is now reconnected to the current session; disable failures are surfaced. Missing push settings are named without exposing their values.
- P2: Repeated notification tests reused a deduplicated tag. Each test now has a unique tag.
- P2: Mark-complete could add duplicate local history and kept completed timers on the local grid. Completion is now tracked by alarm/revision and excluded from the local grid, while retaining other group members' independent acknowledgments.
- P2: Ringing stopped automatically after the five-minute delivery freshness window. Once started, audio now continues until dismissed/completed, cancelled, or superseded.
- P2: A dependency failure during initial loading displayed the join form. It now displays the error and Retry without implying that the user needs a new group/session.
- P2: Mobile viewport prevented zoom. Zoom is now available.

## Validation

29 automated tests pass, including route permissions, stale edits, dependency errors, crop durations, time rollover, rendered frontend controls, sound playback, service-worker deduplication, batching, and repeated push tests. Production build and TypeScript compilation pass. External infrastructure and notification APIs are mocked in tests; this is not a live-device delivery certification.

## Pending deployment evidence / product decision

September 18 follow-up: the supplied scheduling response identified QStash rejecting colons in deduplication IDs. IDs now use stable SHA-256 hex values, with a scheduler regression test. Automatic audio preview on creation was removed. Due alarms retain the full-track loop and an explicit Stop alarm button. Added per-minute AM/PM testing, renamed Timer navigation to Farm, removed Farming from new alarm choices, and simplified crop option/card names. 31 tests and the production build pass. Previously failed timers must be edited/rescheduled after deployment; this patch does not automatically revive failed records or contact production services.

- The reported production 503 still needs the Network response body to distinguish Redis credentials/quota/network failure from missing configuration or scheduler failure. No production credentials or settings were changed.
- User confirmed that every group member may edit/cancel shared timers. Backend creator restrictions are removed and frontend controls match; authentication, group isolation, same-origin checks, and revision checks remain enforced.
- The contentscript.js warnings are not linked to a repository source file. Compare an extension-free browser session and inspect the script URL before attributing them to the app.
- No live push was sent and changes have not been pushed/deployed. Suspended browsers cannot be guaranteed to play a custom MP3; Web Push uses the OS notification sound.
- The existing reconciliation endpoint explicitly returns 501; it is not a working recovery service or a frontend feature. Dispatch retries and explicit rescheduling are implemented. The acknowledgment endpoint is only a receipt; personal completion/history remains browser-local.
