# CJC Racers Race Clock

CJC Racers is moving from device-only alarms to a shared race schedule with server-sent Web Push notifications. The complete product and reliability requirements are in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

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

Create the VAPID key pair once and retain it. Rotating the pair makes existing devices subscribe again. Use a valid operator contact for `VAPID_SUBJECT`, such as `mailto:ops@example.com`.

The QStash dispatch endpoint must be reachable from QStash and verify both current and next QStash signing keys. If Vercel Deployment Protection blocks that endpoint, configure a server-only automation bypass; do not remove callback signature verification.

## Release checks

Run the complete checklist in [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md). Do not declare global notifications complete based on a successful build. Release requires real scheduled push delivery to backgrounded devices, edit/cancel behavior, and recovery tests with evidence recorded for the browser and OS versions tested.

## Repository hygiene

`pnpm-lock.yaml` is the active lockfile. This repository also tracks `package-lock.json`; remove it in the implementation change so local and Vercel installs cannot drift between npm and pnpm.
