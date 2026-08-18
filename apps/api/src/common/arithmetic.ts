/** Divisions that have to answer for a zero or meaningless denominator. */

/** Rounded to whole minor units, because an average of money is still money. */
export function averageOf(total: number, count: number): number {
  return count === 0 ? 0 : Math.round(total / count)
}

/** Null on a zero or negative base, where the sign of a percentage means nothing. */
export function percentChange(current: number, previous: number): number | null {
  return previous <= 0 ? null : roundToTwoPlaces(((current - previous) / previous) * 100)
}

/** Zero when there is no whole to take a share of. */
export function percentOf(amount: number, total: number): number {
  return total <= 0 ? 0 : roundToTwoPlaces((amount / total) * 100)
}

function roundToTwoPlaces(value: number): number {
  return Math.round(value * 100) / 100
}
