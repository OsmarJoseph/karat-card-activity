/**
 * The feed arrives with amounts already formatted by the API. Insights does not, because
 * its figures are aggregates rather than rows, so they are formatted here.
 *
 * USD is assumed, which is assumption 4 in the design: one card programme, one currency.
 */
const DISPLAY_LOCALE = 'en-US'
const DISPLAY_CURRENCY = 'USD'

const money = new Intl.NumberFormat(DISPLAY_LOCALE, {
  style: 'currency',
  currency: DISPLAY_CURRENCY,
})

/** For axis labels, where $1.2K fits and $1,234.56 does not. */
const compactMoney = new Intl.NumberFormat(DISPLAY_LOCALE, {
  style: 'currency',
  currency: DISPLAY_CURRENCY,
  notation: 'compact',
  maximumFractionDigits: 1,
})

const dayLabel = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const timeLabel = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  hour: 'numeric',
  minute: '2-digit',
})

function toMajorUnits(minorUnits: number): number {
  const units = minorUnits / 100
  // Negative zero would print as -$0.00.
  return units === 0 ? 0 : units
}

export function formatMoney(minorUnits: number): string {
  return money.format(toMajorUnits(minorUnits))
}

export function formatMoneyCompact(minorUnits: number): string {
  return compactMoney.format(toMajorUnits(minorUnits))
}

/** Signed, because a change of zero and a rise of zero should not look the same. */
export function formatChange(percent: number): string {
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

export function formatPercent(percent: number): string {
  return `${percent.toFixed(1)}%`
}

export function formatDay(iso: string): string {
  return dayLabel.format(new Date(iso))
}

/** Local time, because the cardholder reads the feed in their own zone. */
export function formatTimeOfDay(iso: string): string {
  return timeLabel.format(new Date(iso))
}
