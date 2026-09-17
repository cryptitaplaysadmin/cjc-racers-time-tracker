// Anchor server time to a monotonic browser clock, unaffected by local clock changes.
export function serverClock(serverTime: number, receivedAt: number) {
  return (monotonicNow: number) => serverTime + Math.max(0, monotonicNow - receivedAt)
}
