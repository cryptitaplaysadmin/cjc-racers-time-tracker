# Alarm repair and crop countdown implementation

## Requirements and acceptance

- When a scheduled alarm becomes due, show the in-app ringer and loop `/alarm-ringtone.mp3` until dismissed or completed. Provide an explicit sound-enable/test action to satisfy browser autoplay rules, and a visible play button if playback is blocked. Do not silently swallow playback errors.
- Display an OS/browser notification with permission. Server Web Push remains responsible for delivery when the page is suspended; an active-page fallback uses the same event ID/tag to avoid routine duplicates. A service worker cannot play arbitrary MP3 audio: background OS notifications use the device's configured sound. State this limitation clearly.
- Diagnose `/api/alarms` 401 vs 503 accurately: absent/expired session is 401; configuration/storage/scheduler failure is 503; invalid input is 400. Keep existing signed-in state for service failures and preserve failed scheduling status. Do not disguise a failed global schedule as success.
- Inspect scheduler URL construction, signature verification, payload shape/expiry, retries and service-worker handling. Test without sending unsolicited group notifications.
- Replace farming stopwatch creation with crop countdowns shared by the account group. Crops: carrots/wheat 8h; grape/corn/sugar cane/apple/pineapple 4h; melon/kiwi/strawberry/blueberry 2h. Pick one crop per timer; repeat to plant more crops. The server derives the deadline from the crop and current time, not a client-supplied duration.
- Show crop name, duration and harvest deadline. Both Farm activity and Timer tab use the same countdown creation and saved group alarms. Keep existing local stopwatch/history readable only as legacy data; do not pretend it has a harvest deadline.
- Add Sprint, Middle and Long buttons that fill the editable race label.
- Replace arbitrary-minute race input with 48 AM/PM slots (12:00 AM through 11:30 PM), default to next half-hour and roll passed slots to tomorrow. Crop deadlines are exact planting time plus duration and are not rounded.

## Execution order and ownership

1. Server agent owns lib/server and app/api: diagnose status codes/scheduler, crop validation, payload dispatch reliability.
2. Form agent owns components/alarm-form, components/timer-panel, lib/crops and lib/time: shared crop catalog, presets and 30-minute picker. Publish interfaces to parent.
3. Parent owns hooks, page integration, audio/ringer, service worker, tests/docs. Coordinate payload and interfaces, integrate and run focused tests plus production build.

## Verification

Test all 11 crops and server-derived durations; all 48 time options and noon/midnight rollover; 401/400/503 distinctions; valid/expired/cancelled/replayed dispatches; warning/start payload compatibility; due-ringer selection, dismissal and retry playback; group isolation regressions. Test actual service-worker handlers using mocked notification APIs. Verify packaged MP3 matches supplied asset. Production build must pass. Live phone push timing and OS sound remain real-device checks; report them separately.

The supplied contentscript.js warnings appear to originate from an injected browser script and are not enough to establish an application memory leak. Do not mask listeners with setMaxListeners; focus on reproducible app/API failures and recommend extension-free comparison only if warnings persist.

## Implementation and verification results

Implemented using parallel server and form agents, with parent integration of audio, notifications, and page state. All 22 automated tests pass (`node --test --test-isolation=none tests/*.test.cjs`), and `npm run build` passes. Tests use mocked infrastructure and browser APIs, not live push delivery. The packaged ringtone matches the supplied music.mp3 by SHA-256.

After deploying this revision, open the app on each receiving device, join the same group, press **Enable sound & notifications**, allow permission, and use **Send test**. Verify an upcoming race alarm in an active tab, then a separate alarm with the app backgrounded. Check that dismissing stops music and that another group does not receive alerts. On iPhone/iPad, install the app on the Home Screen for supported web push. Suspended apps receive OS notification sounds; arbitrary MP3 playback requires a runnable page and browser permission. Failed cloud configuration still requires correcting the deployment's Redis/QStash/VAPID settings; improved status codes do not repair missing credentials.
