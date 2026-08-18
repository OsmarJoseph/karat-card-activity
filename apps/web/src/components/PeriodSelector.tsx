import { GetInsightsPeriod } from '@/api/generated'

const LABELS: Record<GetInsightsPeriod, string> = {
  [GetInsightsPeriod.current_month]: 'This month',
  [GetInsightsPeriod.last_30d]: '30 days',
  [GetInsightsPeriod.last_90d]: '90 days',
}

const ORDER: GetInsightsPeriod[] = [
  GetInsightsPeriod.current_month,
  GetInsightsPeriod.last_30d,
  GetInsightsPeriod.last_90d,
]

export function PeriodSelector({
  value,
  onChange,
  busy,
}: {
  value: GetInsightsPeriod
  onChange: (period: GetInsightsPeriod) => void
  busy: boolean
}) {
  return (
    // A radio group rather than buttons, so the selected period is announced as selected.
    <div
      role="radiogroup"
      aria-label="Insights period"
      className="inline-flex gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-xs"
    >
      {ORDER.map((period) => {
        const selected = period === value
        return (
          <button
            key={period}
            type="button"
            role="radio"
            aria-checked={selected}
            // Disabled only while switching, so the current choice cannot be double fired.
            disabled={busy && !selected}
            onClick={() => onChange(period)}
            className={`rounded-[9px] px-3.5 py-1.5 text-sm transition-colors ${
              selected
                ? 'bg-ink font-semibold text-surface'
                : 'font-medium text-ink-soft hover:bg-sunk hover:text-ink disabled:opacity-50'
            }`}
          >
            {LABELS[period]}
          </button>
        )
      })}
    </div>
  )
}
