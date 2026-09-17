import { ACTIVITY_META, type ActivityKind } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ActivityBadge({
  activity,
  size = 'md',
  className,
}: {
  activity: ActivityKind
  size?: 'sm' | 'md'
  className?: string
}) {
  const meta = ACTIVITY_META[activity]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-display font-medium uppercase tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{
        color: meta.colorVar,
        borderColor: `color-mix(in oklch, ${meta.colorVar} 45%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${meta.colorVar} 12%, transparent)`,
      }}
    >
      <Icon className={size === 'sm' ? 'size-3' : 'size-3.5'} aria-hidden />
      {meta.label}
    </span>
  )
}
