# Global notifications release checklist

Record the deployment URL, commit SHA, test date, browser/OS version, and result for each item. A provider accepting a push is not proof that it displayed on the device.

## Before implementation is enabled

- [ ] Vercel uses the Next.js framework preset, repository root, and no output-directory override.
- [ ] The canonical production URL returns `/`, `/manifest.webmanifest` (or Next manifest route), `/sw.js`, and required icons successfully.
- [ ] `pnpm install --frozen-lockfile` and `pnpm run build` pass from a clean checkout.
- [ ] Production and preview environments use separate `APP_ENV` values and credentials.
- [ ] All values from `.env.example` are configured in the correct Vercel environment without exposing a private key to the client bundle.
- [ ] QStash callback authentication is enabled and a forged callback is rejected.

## Device enrollment

- [ ] Notification permission is requested only after the member presses Enable notifications.
- [ ] A granted permission is not shown as enabled until its push subscription is saved on the server.
- [ ] The device-only test notification displays and opens the app when tapped.
- [ ] Opting out removes the server subscription and stops later sends to that device.
- [ ] iPhone/iPad testing uses the Home Screen-installed web app and records the iOS/iPadOS version.

## Shared schedule and alarm tests

- [ ] Create an alarm on browser profile A; profile B sees it within 60 seconds while visible and after refresh/focus.
- [ ] An opted-in device subscribing after alarm creation receives that future event.
- [ ] A warning and start notification arrive with the creator browser closed and recipient pages backgrounded.
- [ ] Test Android Chrome, Windows Chrome/Edge, and iPhone Home Screen app where available. List unavailable platforms as unverified.
- [ ] Run ten normal scheduled cycles on every supported device type. Record due time, dispatch time, provider acceptance, and observed notification time. Investigate normal-condition delivery later than 30 seconds.
- [ ] Verify one event shows the correct local time in at least two time zones and that a wrong device clock does not change dispatch timing.

## Correctness and recovery

- [ ] Editing an alarm prevents notifications for its prior revision.
- [ ] Cancelling an alarm prevents future queued dispatches, except notifications already in flight.
- [ ] Replayed job callbacks do not create duplicate visible notifications.
- [ ] Temporary provider failures retry without dropping remaining recipients; expired subscriptions are removed.
- [ ] Simulated failures before and after queueing, and after provider acceptance, leave a recoverable state. Record the known duplicate-delivery window.
- [ ] A deployment/restart does not invalidate schedules already queued or device subscriptions.
- [ ] Offline saves cannot appear as successfully scheduled; quotas and configuration failures produce actionable errors.

## Release evidence and operations

- [ ] The administrator diagnostic view shows scheduling failures, overdue dispatches, invalid subscriptions, queue failures, and quota use without logging secrets or subscription endpoints.
- [ ] A test of 100 mocked subscriptions fits measured function runtime and selected free-tier quotas.
- [ ] The production group is enabled only after an isolated test namespace passes these checks.
- [ ] Keep the completed test record with deployment commit SHA and device evidence.
