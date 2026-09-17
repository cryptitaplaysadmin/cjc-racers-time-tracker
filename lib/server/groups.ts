import { randomBytes } from 'node:crypto'
import { ApiError } from './errors'
import type { AccountGroup, Session } from './models'

export function generateGroupCode() { return randomBytes(12).toString('hex').toUpperCase() }
export function normalizeGroupCode(value: unknown) {
  if (typeof value !== 'string') throw new ApiError('Enter a valid group code.', 400)
  const code = value.trim().replace(/[\s-]/g, '').toUpperCase()
  if (!/^[A-F0-9]{24}$/.test(code)) throw new ApiError('Enter a valid group code.', 400)
  return code
}
export function cleanAccountName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > 80) throw new ApiError('Account username must be 1–80 characters.', 400)
  return name
}
export function playingTransition(group: AccountGroup, session: Session, action: unknown, revision: unknown, now = Date.now()): AccountGroup {
  if (session.groupId !== group.id) throw new Error('Group not found.')
  if (!Number.isSafeInteger(revision) || revision !== group.revision) throw new Error('The playing status changed. Review it and try again.')
  if (action !== 'start' && action !== 'stop' && action !== 'takeover') throw new Error('Invalid playing action.')
  if (action === 'stop' && group.playing?.deviceId !== session.deviceId) throw new Error('Only the current player can stop their playing status.')
  if (action === 'start' && group.playing) throw new Error('Someone is already marked as playing. Confirm takeover first.')
  if (action === 'takeover' && (!group.playing || group.playing.deviceId === session.deviceId)) throw new Error('The current player changed. Refresh before taking over.')
  return { ...group, playing: action === 'stop' ? null : { deviceId: session.deviceId, name: session.name, startedAt: now }, revision: group.revision + 1 }
}
