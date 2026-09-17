// Run with: node --env-file=.env.local scripts/reset-user-data.cjs [--apply]
// Deletes only this application's cjc:* records, never flushes the database.
async function command(parts) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parts), signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw Error(`Redis HTTP ${response.status}`)
  const body = await response.json()
  if (body.error) throw Error('Redis rejected reset command')
  return body.result
}
async function keys() {
  let cursor = '0'; const found = new Set()
  do {
    const reply = await command(['SCAN', cursor, 'MATCH', 'cjc:*', 'COUNT', 100])
    cursor = String(reply[0])
    for (const key of reply[1]) { if (typeof key !== 'string' || !key.startsWith('cjc:')) throw Error('Unexpected key outside app namespace'); found.add(key) }
  } while (cursor !== '0')
  return [...found]
}
async function main() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) throw Error('Redis environment settings missing')
  const selected = await keys()
  console.log(`Application records found: ${selected.length}`)
  if (!process.argv.includes('--apply')) return
  let removed = 0
  for (let i = 0; i < selected.length; i += 100) removed += Number(await command(['DEL', ...selected.slice(i, i + 100)]))
  console.log(`Application records deleted: ${removed}`)
  console.log(`Application records remaining: ${(await keys()).length}`)
}
main().catch(error => { console.error(error.message?.startsWith('Redis') ? error.message : 'Reset failed; no credentials logged.'); process.exitCode = 1 })
