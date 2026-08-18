/** Display formatting for amounts held as minor units. */

const DISPLAY_LOCALE = 'en-US'

const formatters = new Map<string, Intl.NumberFormat>()

function formatterFor(currency: string): Intl.NumberFormat {
  const code = currency.toUpperCase()
  const cached = formatters.get(code)
  if (cached) {
    return cached
  }

  const formatter = new Intl.NumberFormat(DISPLAY_LOCALE, { style: 'currency', currency: code })
  formatters.set(code, formatter)
  return formatter
}

/** `formatMinorUnits(-1899, 'usd')` is `-$18.99`. */
export function formatMinorUnits(minorUnits: number, currency: string): string {
  const formatter = formatterFor(currency)
  // Intl knows each currency's own decimal places, so nothing here hardcodes 100.
  const { maximumFractionDigits = 2 } = formatter.resolvedOptions()

  // Display only, and Intl rounds to those decimal places. Dividing an int32 is off by
  // around 1e-13, ten orders of magnitude under the rounding step, so the string is
  // always right. Stored and summed amounts stay integers.
  const units = minorUnits / 10 ** maximumFractionDigits

  // Negative zero survives the division and would print as -$0.00.
  return formatter.format(units === 0 ? 0 : units)
}
