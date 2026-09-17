# CJC Racers updated timer app

Activities: Champion Stake, Grand Master Cup, Farming. Race, Training, Daily Game and Event are removed. Saved entries using removed activities are filtered during loading.

Enter your name and add cup alarms. Farming starts a stopwatch instead of requesting a scheduled time. Its absolute start timestamp is saved, so elapsed time includes time spent away from the app.

Create shareable link generates a snapshot containing your name, pending alarms and current farming stopwatch. Copy it to other players. Viewers have a separate local notification record and do not overwrite their own saved timers. Changing or stopping your timers does not update old links. Create and send a fresh link after changes. Anyone possessing the link can read the snapshot.

Each viewer must enable notifications and keep the page open. The app checks for a warning during the final minute and an alarm when the deadline arrives. Browsers can suspend background pages and delay delivery. Reopening checks timestamps immediately. Closed-browser notifications and live cross-device updates require a backend and Web Push, which are excluded by the selected local-storage setup.

## Deploy to the existing Vercel project
Replace the source in the repository connected to your existing Vercel project with this ZIP's contents, then deploy normally. The original lockfile and package scripts are preserved. Alternatively import this source as a new Vercel project; that will get a different URL. This ZIP alone does not grant access to update the original deployment.

## Verification
TypeScript no-emit check passed. Share-link round trip including Unicode, pending-only alarms, warning reset, and malformed-link rejection passed. Next.js production compilation succeeded. Final build and browser preview could not complete because this local environment blocks subprocess launch with spawn EPERM. Run the full build in Vercel before publishing.
# cjc-racers-time-tracker
