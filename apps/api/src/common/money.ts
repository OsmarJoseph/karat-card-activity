/**
 * Formats minor units for display. Intl accepts a decimal string, so the amount is
 * split by string arithmetic and never passes through a float.
 */

const DISPLAY_LOCALE = 'en-US'

interface CurrencyFormatter {
  format: Intl.NumberFormat
  fractionDigits: number
}

const formatters = new Map<string, CurrencyFormatter>()

/** Read off a formatted zero, since `resolvedOptions` types the digit counts as optional. */
function fractionDigitsOf(format: Intl.NumberFormat): number {
  const fraction = format.formatToParts(0).find((part) => part.type === 'fraction')
  return fraction?.value.length ?? 0
}

function formatterFor(currency: string): CurrencyFormatter {
  const code = currency.toUpperCase()
  const cached = formatters.get(code)
  if (cached) {
    return cached
  }

  const format = new Intl.NumberFormat(DISPLAY_LOCALE, { style: 'currency', currency: code })
  const formatter: CurrencyFormatter = { format, fractionDigits: fractionDigitsOf(format) }
  formatters.set(code, formatter)
  return formatter
}

function toDecimalString(minorUnits: number, fractionDigits: number): `${number}` {
  const sign = minorUnits < 0 ? '-' : ''
  const digits = Math.abs(minorUnits)
    .toString()
    .padStart(fractionDigits + 1, '0')
  const point = digits.length - fractionDigits
  const decimal =
    fractionDigits === 0
      ? `${sign}${digits}`
      : `${sign}${digits.slice(0, point)}.${digits.slice(point)}`

  // A minus, digits, one point: a numeric literal the compiler cannot see through
  // concatenation.
  return decimal as `${number}`
}

/** `formatMinorUnits(-1899, 'usd')` is `-$18.99`. */
export function formatMinorUnits(minorUnits: number, currency: string): string {
  const { format, fractionDigits } = formatterFor(currency)
  return format.format(toDecimalString(minorUnits, fractionDigits))
}
