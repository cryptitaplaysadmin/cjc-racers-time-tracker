# CJC Racers Race Clock

CJC Racers tracks shared timers for game accounts and lets players manually indicate who is using each account. The account-group requirements are in [ACCOUNT_GROUP_PLAN.md](ACCOUNT_GROUP_PLAN.md), which supersedes the single-group assumptions in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Account groups

Choose Create account group, enter the game account username and your own player name, and the app generates and saves a private group code automatically. Share that code with other players. They choose Join group and enter the code and their own name. Creating groups never requires changing Vercel settings or redeploying.

The game username labels the group; player names identify people. Anyone with the group code can join its schedule. The code is access to this tracker, not a game password.

Tap I'm playing this account to claim the manual playing status. Other members see your name and start time. Stop playing clears your status; someone else must explicitly confirm a takeover to replace you. Creating a timer, opening the page, or closing the browser never changes this status. This tracker does not control the game's login or logout.

Each player can manage the alarms they created from their device. Leaving the group removes that device's notification registration; rejoin and enable notifications again to resume alerts. Mark yourself as stopped before switching groups. Old single-group sessions must create or join an account group; old stored timers are not automatically broadcast.

## Current status

The app now includes shared-schedule API routes, device subscription handling, QStash dispatch callbacks, and Web Push delivery code. It becomes operational only after the required Upstash and VAPID environment variables are configured on the deployed canonical domain. Until then, the interface reports that global alarms are not configured rather than pretending that local timers are shared.

## Local development

Use pnpm, which is the package manager declared in `package.json` and the one Vercel detects.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Local browser notifications require permission from a user action. Push delivery should be tested against HTTPS (a Vercel preview or the production domain), not treated as production-ready merely because a local alert appears.

## Vercel deployment baseline

The project is a Next.js app. In Vercel Project Settings > Build and Deployment, use:

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | Repository root, the folder with `package.json` |
| Install Command | Default |
| Build Command | Default or `pnpm run build` |
| Output Directory | No override |
| Production Branch | `main` |

Redeploy without the build cache after correcting a setting. Confirm the deployment URL and the assigned production domain both return the homepage at `/`; the app currently has no separate `/dashboard` or `/timer` routes.

Choose one canonical HTTPS production URL before enabling push. Browser push subscriptions are tied to an origin, so preview URLs and custom domains have separate subscriptions. Previews must use isolated test credentials and must never send alerts to the production group.

## Required production configuration

Global notifications need an account-owned Upstash Redis database, Upstash QStash scheduler, and a stable VAPID key pair. Copy `.env.example` to `.env.local` for local setup, then set the real values in Vercel Project Settings > Environment Variables. Do not commit `.env.local` or private keys.

For Vercel Production set `APP_ENV=production` and `APP_ORIGIN` to your stable HTTPS app domain. `GROUP_JOIN_CODE` and `ADMIN_ACCESS_CODE` are obsolete and no longer required. Deploy the account-group feature once; every subsequent group and playing-status change is saved automatically in Redis.

Create the VAPID key pair once and retain it. Rotating the pair makes existing devices subscribe again. Use a valid operator contact for `VAPID_SUBJECT`, such as `mailto:ops@example.com`.

The QStash dispatch endpoint must be reachable from QStash and verify both current and next QStash signing keys. If Vercel Deployment Protection blocks that endpoint, configure a server-only automation bypass; do not remove callback signature verification.

## Release checks

Run the complete checklist in [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md). Do not declare global notifications complete based on a successful build. Release requires real scheduled push delivery to backgrounded devices, edit/cancel behavior, and recovery tests with evidence recorded for the browser and OS versions tested.

Run the account-group regression tests without cloud credentials:

```powershell
node --test --test-isolation=none tests/account-groups.test.cjs tests/account-routes.test.cjs
```

These exercise the actual domain logic and API handlers with an in-memory store and mocked scheduler. They cover creation/joining, session reload, group isolation, rejected cross-origin requests, separate timer/playing behavior, and revision conflicts. Live Redis and real-device push delivery remain separate release checks.

## Repository hygiene

`pnpm-lock.yaml` is the active lockfile. Use pnpm consistently for dependency changes.
