'use client'

import { Timer, Trophy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActivityBadge } from '@/components/activity-badge'
import { type HistoryEntry } from '@/lib/types'
import { formatClock, formatDayLabel, formatDuration } from '@/lib/time'

export function HistoryPanel({
  history,
  onClear,
}: {
  history: HistoryEntry[]
  onClear: () => void
}) {
  const totalTracked = history.reduce((sum, h) => sum + (h.durationMs ?? 0), 0)

  return (
    <section className="space-y-4">
      <div className="mx-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold uppercase tracking-tight">
            Activity history
          </h2>
          {totalTracked > 0 && (
            <p className="text-sm text-muted-foreground">
              {formatDuration(totalTracked)} tracked across {history.length}{' '}
              {history.length === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onClear}
          >
            <Trash2 className="size-4" aria-hidden />
            Clear
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No finished activities yet. Complete an alarm or log a session to see
          it here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5 px-5">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3"
            >
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary"
                aria-hidden
              >
                {entry.source === 'timer' ? (
                  <Timer className="size-5 text-accent" />
                ) : (
                  <Trophy className="size-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold uppercase tracking-tight">
                  {entry.label}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <ActivityBadge activity={entry.activity} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {formatDayLabel(entry.at)} · {formatClock(entry.at)}
                  </span>
                </div>
              </div>
              {entry.durationMs != null && (
                <span className="tabular shrink-0 font-display text-sm text-accent">
                  {formatDuration(entry.durationMs)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
