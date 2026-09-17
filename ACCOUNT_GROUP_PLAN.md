# Account groups and manual playing status

This revision supersedes the single global group/password assumptions in IMPLEMENTATION_PLAN.md.

1. Create a group with a game account username and a separate player display name. The server generates an unpredictable code, stores the group in Redis, and joins the creator automatically. Codes are database records; creating/joining requires no redeploy or environment changes.
2. Join with the shared code and your own player name. Each device session belongs to exactly one group. Display the account username, your player name, and a copyable group code. Leaving clears the session/subscription; joining another group cannot leak timers or push subscriptions.
3. Group members see only their account's timers and notifications. Creating timers never changes playing status. Keep farming and history local as currently implemented.
4. Each group has one manual playing status: player/device identity, start time, and revision. Start sets yourself as playing; stop is permitted only for the current player. A different member must explicitly confirm takeover of the displayed player. Atomic revision checks reject competing/stale writes.
5. Persist playing status until stopped or explicitly taken over; do not infer status from page visibility, timer creation, or inactivity. Show the start time and explain that this does not control game login/logout.
6. API contract: POST /api/session {action:'create', accountName, name} or {action:'join', joinCode, name}; GET /api/session and GET /api/alarms return {session:{deviceId,name,role},group:{id,accountName,code,playing,revision}} (alarms endpoint additionally returns alarms/serverTime). POST /api/group/playing accepts {action:'start'|'stop'|'takeover',revision}; conflict returns 409 with current group. DELETE /api/session leaves.
7. Keep old single-group sessions from accessing a nonexistent group: require joining/creating anew with clear guidance. Do not delete or automatically broadcast legacy stored alarms.
8. Remove GROUP_JOIN_CODE and ADMIN_ACCESS_CODE from required configuration and current setup instructions. Infrastructure credentials remain unchanged. One code deployment installs this feature; subsequent groups are automatic.
9. Verification: production build plus focused tests for code generation, separate group isolation, create/join, session reload, manual start/stop, takeover confirmation/revision conflicts, and subscription scoping. Use mocks or isolated test data; never broadcast tests to existing members. Report live-device limitations honestly.

Parallel ownership: backend agent owns lib/server and app/api; interface agent owns app/page, hooks and components; verification agent owns tests/docs. Parent integrates and verifies the combined result. Preserve the existing ringtone asset and unrelated user changes.
