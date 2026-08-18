import { SpendCategory } from '@prisma/client'

function group(codes: string[], category: SpendCategory): Array<[string, SpendCategory]> {
  return codes.map((code) => [code, category])
}

/**
 * Stripe reports the merchant's category as a four digit MCC. These are the codes
 * a card programme actually sees; anything unlisted falls through to `other`, and
 * Stripe's own label is stored alongside so a bad mapping can be traced.
 */
const BY_MCC = new Map<string, SpendCategory>([
  ...group(['5811', '5812', '5813', '5814', '5462'], SpendCategory.food_drink),
  ...group(['5411', '5422', '5441', '5451', '5499'], SpendCategory.groceries),
  ...group(
    // prettier-ignore
    ['5200', '5211', '5231', '5251', '5261', '5300', '5310', '5311', '5331', '5399',
     '5611', '5621', '5631', '5641', '5651', '5655', '5661', '5691', '5699', '5712',
     '5719', '5722', '5732', '5733', '5735', '5941', '5942', '5943', '5944', '5945',
     '5947', '5977', '5992', '5999'],
    SpendCategory.shopping,
  ),
  ...group(
    ['4111', '4112', '4121', '4131', '4784', '5541', '5542', '7523'],
    SpendCategory.transport,
  ),
  ...group(['4411', '4511', '4722', '7011'], SpendCategory.travel),
  ...group(
    // prettier-ignore
    ['5815', '5816', '5818', '7832', '7841', '7922', '7929', '7932', '7933', '7941',
     '7991', '7992', '7993', '7994', '7996', '7997', '7998', '7999'],
    SpendCategory.entertainment,
  ),
  ...group(['4816', '5734', '5817', '7372', '7379'], SpendCategory.software),
  ...group(['4814', '4899', '4900'], SpendCategory.utilities),
  ...group(
    [
      '5912',
      '5975',
      '5976',
      '8011',
      '8021',
      '8031',
      '8041',
      '8042',
      '8049',
      '8062',
      '8071',
      '8099',
    ],
    SpendCategory.health,
  ),
  ...group(
    ['7311', '7338', '7392', '8111', '8911', '8931', '8999'],
    SpendCategory.professional_services,
  ),
  ...group(
    ['6010', '6011', '6012', '6051', '6300', '7276', '9211', '9222', '9311'],
    SpendCategory.fees,
  ),
])

/** Individual airlines, car rental agencies and hotels each get their own MCC. */
const TRAVEL_RANGE = { from: 3000, to: 3999 } as const

export function mapMccToCategory(mcc: string): SpendCategory {
  const direct = BY_MCC.get(mcc.trim())
  if (direct) {
    return direct
  }

  const numeric = Number.parseInt(mcc, 10)
  if (Number.isInteger(numeric) && numeric >= TRAVEL_RANGE.from && numeric <= TRAVEL_RANGE.to) {
    return SpendCategory.travel
  }

  return SpendCategory.other
}
