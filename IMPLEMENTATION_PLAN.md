# CJC Racers: shared alarms and background notifications

Plan prepared September 17, 2026. This is an implementation specification, not a claim that global notifications already work. No cloud resources or subscriptions are created by this plan.

## 1. Required outcome

One member creates a scheduled cup alarm. All members subscribed to CJC Racers receive a notification one minute before its scheduled time and another when it starts, on each subscribed phone or laptop. Delivery must originate on the server and must not depend on the creator or recipients keeping the page active.

“Everyone” means every device that joined the group and explicitly enabled notifications. Visiting a website cannot silently grant notification permission. Push delivery remains subject to internet connectivity, browser/OS policies, Focus settings, and device availability; exact-second delivery cannot be guaranteed.

The shared schedule must appear on every member's device. Creating, editing, or cancelling an alarm updates that shared schedule. Dismissing a notification affects only the recipient. Cancelling the underlying alarm is a separate action.

### Proposed product defaults

- One CJC Racers group initially; no multi-group management screen.
- Members join using a group code, enter a display name, and receive a device session. Names are labels, not proof of identity.
- Any member can create alarms; only their originating device or an administrator can edit/cancel them. An administrator can revoke devices and rotate the join code. Full personal accounts and account recovery can be added later.
- Champion Stake and Grand Master Cup retain scheduled alarms and one-minute warnings.
- Farming remains an elapsed-time stopwatch. Starting it does not imply a deadline or broadcast an alarm. Adding farming completion alerts would require an explicit duration/end-time field.
- No immediate broadcast on creation by default: members see it in the shared schedule and receive the warning/start alerts. This avoids unnecessary notifications.
- Initial target: up to 100 subscribed devices and 50 new alarms per day. This is a test target, not a guaranteed free-tier capacity.
- Explicit date and time selection, defaulting to the next occurrence of the selected time. Limit scheduling to the next 24 hours initially, fitting the existing use case and delayed-message limits.

These are implementation assumptions that can be adjusted before coding; they do not require purchasing services.

## 2. Existing project and gaps

The project uses Next.js 16, React 19, and Tailwind. The production build passed locally with network access, and the supplied Vercel log also generated `/` successfully.

Current alarms, history, and farming state live in localStorage. Share links embed a snapshot. The hook checks alarms using a browser interval. The service worker displays notifications but has no server sender or subscription registration. There is no shared database, authentication, scheduler, or push API.

A manifest and Apple web app metadata have been added locally. They are only installation groundwork. The existing Ready-but-404 deployment must be fixed and verified before testing push on the production domain.

## 3. Architecture and free-tier boundaries

Use the existing Vercel project for the UI and Next.js API routes. Add Upstash Redis for shared state and Upstash QStash for delayed HTTP callbacks. Use the standard `web-push` library and VAPID keys for browser push; no separate paid notification platform is required.

Flow: member saves alarm → authenticated API stores alarm and dispatch records → API schedules warning/start callbacks → QStash calls signed server endpoint at the appropriate times → server checks the current alarm version and sends Web Push to current group subscriptions → each device's service worker displays it.

The foreground countdown remains local and smooth; network polling never drives notification timing. Hidden pages stop schedule polling, and server push continues independently.

Current published free allowances:

| Service | Allowance / implication |
| --- | --- |
| Upstash Redis Free | 256 MB, 500,000 commands/month, 10 GB bandwidth/month |
| QStash Free | 1,000 delivery attempts/day; retries consume attempts; published maximum delay is 7 days |
| Vercel | Existing hosting and API functions, subject to the account's plan eligibility and resource limits |
| Standard Web Push | No additional notification vendor subscription; server requests still consume hosting resources |

Keep accounts on explicitly selected free plans. Do not enable paid upgrades automatically. Recheck actual dashboard quotas during setup. Count retries, recovery jobs, and fan-out batches as well as initial messages. Roughly two scheduled callbacks per alarm are only the starting cost; Redis commands and function usage depend on subscriptions, polling, and retries.

Vercel Hobby cron runs at most daily and has an hourly execution window. It is unsuitable for triggering race alarms. QStash provides the alarm scheduler instead.

Sources: [Redis pricing](https://upstash.com/pricing/redis), [QStash pricing](https://upstash.com/pricing/qstash), [QStash delayed messages](https://upstash.com/docs/qstash/overall/usecases), [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## 4. One-time setup

1. Confirm Vercel is connected to `cryptitaplaysadmin/cjc-racers-time-tracker`, production branch `main`, and the folder containing `package.json`.
2. Set the framework preset to Next.js and disable the output-directory override. Redeploy and verify the direct deployment URL and production domain both return the homepage successfully.
3. Choose one stable HTTPS production origin. Push subscriptions belong to that origin; preview domains must not register production users or send production alerts.
4. Create and retain an account-owned Upstash Redis database on the free plan. Select a region near the Vercel function region. Do not use an unclaimed temporary database for production.
5. Enable QStash on its free plan in the same account. Save its publishing token and current/next signing keys.
6. Generate a VAPID key pair once using a local setup script. Store the private key as a secret. Keep the keys stable across deployments; rotation needs a device resubscription plan.
7. Generate independent group, administrator, and session secrets. Exchange join/admin codes for secure server sessions; never expose the administrator secret in client code or a share URL.
8. Set production environment variables in Vercel; use `.env.local` for local development and provide a placeholder-only `.env.example`.
9. Ensure the production callback endpoint is reachable by QStash. If deployment protection blocks it, configure a server-only automation bypass. QStash signature verification remains mandatory.
10. Deploy, run a private test notification on each test device, then run a real scheduled test with pages backgrounded.

| Environment variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Canonical HTTPS production URL used for callbacks and notification links |
| `UPSTASH_REDIS_REST_URL` | Database REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only database credential |
| `QSTASH_TOKEN` | Server-only scheduler publishing credential |
| `QSTASH_CURRENT_SIGNING_KEY` | Verify scheduler callbacks |
| `QSTASH_NEXT_SIGNING_KEY` | Allow scheduler signing-key rotation |
| `VAPID_PUBLIC_KEY` | Public push key, returned by a configuration endpoint |
| `VAPID_PRIVATE_KEY` | Server-only push signing key |
| `VAPID_SUBJECT` | Valid operator contact URI, such as `mailto:...` |
| `SESSION_SECRET` | Signing secret for secure sessions |
| `GROUP_JOIN_CODE` | Initial group access code, checked only server-side |
| `ADMIN_ACCESS_CODE` | Separate administrator access code |
| `APP_ENV` | Isolate production and test records and callbacks |

Missing configuration must produce an actionable setup error. It must never silently label local-only alarms as globally scheduled.

## 5. Server data and API design

Store versioned records and indexes in Redis; use atomic transactions/scripts for changes that must happen together. Use server-generated IDs and timestamps.

| Record | Required fields |
| --- | --- |
| Device/member | ID, group, display name, role, session/revocation metadata |
| Alarm | ID, group, creator, activity, label, scheduled UTC time, display timezone, revision, lifecycle status, created/updated timestamps |
| Dispatch | Alarm ID, revision, warning/start kind, due time, queue message ID, enqueue state, attempts, error state |
| Subscription | Device/group, endpoint, encryption keys, creation time, last confirmation, enabled/revoked status |
| Delivery | Alarm/revision/kind/subscription identifier, lease, attempt count, provider acceptance/failure timestamp |
| Acknowledgement | Device, alarm, dismissed/completed timestamp |

Keep subscription endpoints and encryption keys private. Never include them in public schedule responses or logs. Retain recent alarm/delivery history for 30 days with explicit cleanup; don't expire a functioning subscription simply because its owner hasn't opened the page recently.

Proposed routes:

- `POST /api/session`: join group or authenticate administrator, with rate limiting.
- `DELETE /api/session`: revoke the device session and disable its group subscription.
- `GET /api/alarms`: current schedule, revision, and server time; no stale shared CDN cache.
- `POST /api/alarms`: validate and create an alarm using an idempotency key.
- `PATCH /api/alarms/[id]`: authorized revision-checked edit; reject conflicting edits.
- `DELETE /api/alarms/[id]`: authorized cancellation and invalidation of queued work.
- `POST /api/alarms/[id]/ack`: personal acknowledgement only.
- `GET /api/push/config`: public VAPID key and readiness state, without secrets.
- `POST /api/push/subscriptions`: register/refresh the current device subscription.
- `DELETE /api/push/subscriptions`: opt out for this device.
- `POST /api/push/test`: rate-limited test sent only to the requesting device.
- `POST /api/jobs/dispatch`: signature-verified QStash callback for fan-out and retry batches.
- `POST /api/jobs/reconcile`: signature-verified repair of stranded scheduling records.
- Protected administrator diagnostics: scheduling failures, queue health, aggregate delivery results, and device revocation.

Use Node.js runtime for push routes. Enforce membership and ownership on the server, not through hidden buttons. Validate field lengths, dates, payload sizes, request origin, and subscription shape. Restrict outbound push requests to reviewed HTTPS push-provider endpoints to prevent arbitrary server requests; reject private/local addresses and unsafe redirects. Use secure HttpOnly SameSite cookies and rate limits on join, mutation, subscription, and test endpoints.

## 6. Scheduling and failure handling

1. Validate a future deadline using server time. Interpret explicit dates/timezones consistently, store UTC, and return the server's timestamp to compensate for device clock drift.
2. Atomically save the alarm as `scheduling` and create durable dispatch intent records. Publish callbacks with stable identifiers derived from alarm ID, revision, and event kind.
3. Mark `scheduled` only when all required enqueue operations have been acknowledged and their IDs saved. An error must display `Scheduling failed / Retry`, not `Alarm added`.
4. For an alarm less than one minute away, skip the already-past warning and schedule only the start event.
5. Callback handlers verify signatures and body, then re-read the alarm. Old revisions, cancelled alarms, early callbacks, and events outside their validity window cannot send notifications.
6. On edit, increment the revision, invalidate old dispatches, and schedule the replacement. Best-effort removal of old queue messages reduces load; revision checks provide correctness even if removal fails.
7. At dispatch, select devices subscribed to the group at that time. A member subscribing after alarm creation still receives its future events. Unsubscribed/revoked devices are excluded.
8. Process bounded subscription batches with limited concurrency and timeouts so work fits Vercel function limits. Retry transient failures per device without intentionally resending already accepted deliveries. Remove subscriptions when the push provider reports expiration, such as 404/410.
9. Use atomic leases and durable per-device results. Queue deduplication alone is insufficient. There is a crash window between provider acceptance and recording success, so true exactly-once delivery is not promised; stable notification tags and service-worker IndexedDB deduplication reduce visible duplicates.
10. Set short, event-specific push TTLs: a warning expires at the start time; a start alert expires five minutes afterward. Suppress expired warnings and label late start notifications. Notifications already delivered cannot be recalled after cancellation.
11. Run a low-frequency QStash reconciliation job, initially every 15 minutes, to repair stranded enqueue intents and expose dead letters. This is failure recovery, not normal alarm timing. Recovery cannot retroactively deliver an on-time alarm; record missed events and show failures honestly.
12. Recheck quota and provider outages before accepting additional schedules. Do not fall back to unreliable in-memory timers inside Vercel functions.

## 7. Browser and interface changes

- Refactor `hooks/use-race-clock.ts` to load the server schedule and submit mutations. Keep local interval calculations for display only. Refresh on focus, network restoration, mutation, and every 60 seconds while visible. One polling leader per browser origin avoids duplicate-tab traffic.
- Add clear saving, scheduling, scheduled, failed, cancelled, and offline states. Disable duplicate submissions. Preserve entered data after failures.
- Show all members' alarms with creator names and local timezone labels. Use a revision or ETag to limit transfer, while accounting for database reads even on unchanged checks.
- Add an explicit Enable notifications button. Permission must be requested from a user gesture. Register `/sw.js`, await worker readiness, obtain/refresh the PushManager subscription, and confirm server persistence before showing “Global notifications enabled.”
- Permission granted without a saved push subscription is an incomplete state. Provide repair, test notification, and disable-on-this-device actions.
- On iPhone/iPad, show Home Screen installation instructions when required. Add proper 192px and 512px PNG icons, a maskable icon, and an Apple touch icon. Verify manifest, scope, start URL, and standalone launch behavior.
- Extend `public/sw.js` to validate incoming payloads, suppress expired/duplicate events, display notifications, and focus/open the same-origin alarm page on click. Avoid caching authenticated API responses or stale app HTML.
- Server push owns system notifications for global alarms. Foreground UI may display a ringer, but browser interval code must not create a second OS notification for the same event.
- Retain farming stopwatch behavior. Make “dismiss for me” distinct from “cancel for everyone.”
- Replace snapshot-only sharing with the live group schedule link and separate join-code onboarding. Old snapshot links remain explicitly legacy/local and must not automatically publish alarms.
- Offer an explicit one-time import of existing local alarms after joining. Preview the entries, skip expired entries, and deduplicate imports. Never broadcast stored local alarms automatically.

Web Push can start the service worker while the page is not loaded. iOS/iPadOS requires a Home Screen web app and user-initiated notification permission on supported versions. Fully force-stopped browsers, offline devices, and OS suppression are outside an exact delivery guarantee. Sources: [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [Apple Web Push requirements](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## 8. Implementation sequence and deliverables

1. **Deployment baseline:** resolve the current 404; verify canonical domain, root route, static assets, and service-worker URL. Standardize on one package manager and one matching lockfile; verify a fresh frozen install, not just existing node_modules.
2. **Backend foundation:** install `@upstash/redis`, `@upstash/qstash`, `web-push`, and push typings; add configuration validation, data access, sessions, validation, and access tests.
3. **Shared schedule:** implement CRUD, personal acknowledgements, concurrency handling, local-data import, and UI synchronization. Validate across two independent browser profiles.
4. **Device push:** implement subscription persistence, opt-out, service-worker handling, installation flow, and device-only test notification.
5. **Server alarms:** implement scheduling intents, delayed jobs, revisions, batching, retries, deduplication, expiration, reconciliation, and diagnostics.
6. **Production validation:** deploy isolated test configuration, run the matrix below, resolve failures, and then enable the production group.
7. **Handoff:** provide `.env.example`, setup/key-generation instructions, accurate README, supported-device guidance, troubleshooting guide, quota estimates from measurements, and a test report with evidence.

Likely new modules: `lib/server/{config,store,auth,alarms,push,scheduler}.ts`, `lib/push-client.ts`, the API routes above, notification setup UI, device/session hooks, and focused integration tests. Existing app, header, form, schedule, history, service worker, and types will be updated. No secrets belong in Git.

## 9. Verification and acceptance criteria

Automated checks must cover behavior and failure recovery, not merely reproduce implementation details. Use injected/mock clock and provider adapters for deterministic failures, plus an isolated live environment for actual integrations.

| Test | Pass requirement |
| --- | --- |
| Clean installation and production build | Fresh locked dependency install, TypeScript and Next build succeed |
| Deployed routing | `/`, manifest, icons, JS assets, and `/sw.js` return correct status/content type on stable domain |
| Shared schedule | Create on A; B sees it within 60 seconds while visible, immediately after focus/refresh |
| Global push | A creates alarm; opted-in B and C receive warning/start without opening a share snapshot |
| Background delivery | Repeat with creator closed and recipients backgrounded/locked; no page interval required |
| Platform matrix | Android Chrome; iPhone Home Screen app; Windows Chrome/Edge; macOS Safari where available |
| Normal timing | At least 10 scheduled cycles per supported test platform; record due time, callback time, provider acceptance, and observed display time; target delivery within 30 seconds under normal connectivity |
| Timezones and clock drift | One UTC event displays correctly in different zones; incorrect device clock does not change dispatch |
| Editing/cancellation | Prior revision jobs do not deliver after cancellation/edit has been committed, excluding already in-flight pushes |
| Retries and duplicate jobs | Repeated callbacks and partial batch failures do not cause routine duplicate visible alerts or lost remaining batches |
| Crash recovery | Simulated crash before/after enqueue and after provider acceptance produces recoverable state and documented duplicate-window behavior |
| Subscription lifecycle | Late subscriber gets future event; opt-out stops future sends; expired subscription is removed |
| Permission/installation | Denied, unsupported, uninstalled iPhone, and granted-but-unsaved states have accurate guidance |
| Offline and quotas | Offline save cannot falsely succeed; exhausted services expose scheduling failure; stale warning is not replayed on reconnect |
| Security | Nonmembers cannot read/write schedules; members cannot modify others' alarms; forged callbacks rejected; no secrets exposed |
| Legacy data | Import is explicit/idempotent; old links don't publish globally; farming and personal history remain usable |
| Redeployment | Alarms scheduled before redeploy still dispatch; existing device subscriptions remain valid |
| Load | Test 100 mocked subscriptions per event plus a smaller real-device group; fan-out fits measured function and quota budgets |

Record which hardware/OS/browser versions were actually tested. If a platform is unavailable, list it as unverified rather than passed. Provider acceptance is not proof the notification was displayed; use device observation or explicit user acknowledgement for end-to-end evidence.

Timing targets are release test criteria, not a network/OS SLA. Investigate any normal-condition miss before release. Document behavior with Focus enabled, denied permissions, force-stopped browsers, and disconnected devices separately.

## 10. Release, operations, and completion gate

Deploy with an isolated test group and namespace first. Use production credentials only on the canonical production deployment; previews must not send real group broadcasts. A runtime readiness check should report missing configuration without exposing secrets.

Monitor scheduling failures, overdue dispatches, transient push failures, invalid subscriptions, queue dead letters, and quota use. Keep structured logs keyed by alarm/revision/event, without credentials or subscription endpoints. Include a simple administrator retry action for recoverable scheduling failures.

If rollback is needed, pause new global alarms and explicitly cancel or drain queued jobs. A UI rollback alone does not stop QStash callbacks. Keep callback payloads versioned and backward compatible during deployments.

Completion requires: the production 404 is resolved; shared schedules work across devices; actual server push passes real-device background tests; edit/cancel and recovery tests pass; measured usage fits selected free tiers; setup and troubleshooting instructions match the deployed system. A successful build or adding a manifest alone does not meet this gate.

Inputs needed during implementation: access to Vercel settings, an account-owned free Upstash setup, the canonical app URL, an operator contact for VAPID, and at least one laptop and phone for permission/lock-screen tests. Secrets should be entered directly into environment settings, not pasted into chat.
