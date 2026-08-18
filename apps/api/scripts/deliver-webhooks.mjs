/**
 * Delivers signed Stripe Issuing webhooks to a locally running API, so the whole
 * write path can be exercised without a Stripe account.
 *
 * The signature is real. `stripe.webhooks.generateTestHeaderString` is Stripe's
 * own helper for signing a payload with your webhook secret, and the API verifies
 * it with `constructEvent` exactly as it does in production. Nothing is stubbed
 * or bypassed; this only stands in for the sender.
 *
 *   node apps/api/scripts/deliver-webhooks.mjs seed   a spend history covering every UI state
 *   node apps/api/scripts/deliver-webhooks.mjs live   paced purchases, to watch the feed move
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function env() {
  let file = ''
  try {
    file = readFileSync(resolve(ROOT, '.env'), 'utf8')
  } catch {
    throw new Error('No .env at the repo root. Copy .env.example to .env first.')
  }
  const read = (key) => {
    const line = file.split('\n').findLast((l) => l.startsWith(`${key}=`))
    return (
      line
        ?.slice(key.length + 1)
        .trim()
        .replace(/^["']|["']$/g, '') ?? ''
    )
  }
  const secret = read('STRIPE_WEBHOOK_SECRET')
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set in .env')
  return {
    secret,
    // Any value works: the simulator signs with the same secret the API verifies
    // with, so the placeholder from .env.example is enough.
    cardholderId: read('CARDHOLDER_STRIPE_ID') || 'ich_local',
    url: `http://localhost:${read('PORT') || 3000}/api/v1/webhooks/stripe`,
  }
}

const { secret, cardholderId, url } = env()

const CARD_ID = 'ic_local'
const seconds = (date) => Math.floor(date.getTime() / 1000)
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000)

/** Stripe nests the cardholder inside the card, and the card inside the event. */
const cardholder = () => ({
  id: cardholderId,
  object: 'issuing.cardholder',
  billing: {
    address: {
      city: 'San Francisco',
      country: 'US',
      line1: '510 Townsend St',
      postal_code: '94103',
      state: 'CA',
    },
  },
  created: seconds(daysAgo(120)),
  email: 'ada@example.com',
  livemode: false,
  name: 'Ada Lovelace',
  status: 'active',
  type: 'individual',
})

const card = () => ({
  id: CARD_ID,
  object: 'issuing.card',
  brand: 'Visa',
  cardholder: cardholder(),
  created: seconds(daysAgo(120)),
  currency: 'usd',
  exp_month: 12,
  exp_year: 2030,
  last4: '4242',
  livemode: false,
  status: 'active',
  type: 'virtual',
})

const merchant = (name, mcc, category) => ({
  category,
  category_code: mcc,
  city: 'San Francisco',
  country: 'US',
  name,
  network_id: '1234567890',
  postal_code: '94107',
  state: 'CA',
  terminal_id: null,
})

const authorization = ({ id, amount, at, status = 'pending', merchantData }) => ({
  id,
  object: 'issuing.authorization',
  amount,
  approved: true,
  authorization_method: 'chip',
  card: card(),
  cardholder: cardholderId,
  created: seconds(at),
  currency: 'usd',
  livemode: false,
  merchant_amount: amount,
  merchant_currency: 'usd',
  merchant_data: merchantData,
  status,
  transactions: [],
  wallet: null,
})

/**
 * Stripe signs a transaction by its impact on your balance, so a capture arrives
 * negative and a refund positive. Mirrored here, because the API deliberately
 * ignores that sign and derives its own from `type`.
 */
const transaction = ({ id, amount, type, at, authorizationId = null, merchantData }) => ({
  id,
  object: 'issuing.transaction',
  amount: type === 'capture' ? -amount : amount,
  authorization: authorizationId,
  card: card(),
  cardholder: cardholderId,
  created: seconds(at),
  currency: 'usd',
  dispute: null,
  livemode: false,
  merchant_amount: type === 'capture' ? -amount : amount,
  merchant_currency: 'usd',
  merchant_data: merchantData,
  type,
  wallet: null,
})

let sent = 0

async function deliver(type, object, { at = new Date(), eventId } = {}) {
  const event = {
    id: eventId ?? `evt_local_${++sent}_${Math.floor(at.getTime() / 1000)}`,
    object: 'event',
    api_version: '2026-07-29.dahlia',
    created: seconds(at),
    data: { object },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type,
  }

  const body = JSON.stringify(event)
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret })

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': signature },
    body,
  })
  const text = await response.text()
  const mark = response.ok ? '  ok' : 'FAIL'
  console.log(`${mark}  ${type.padEnd(32)} ${object.id.padEnd(22)} ${response.status} ${text}`)
  if (!response.ok) process.exitCode = 1
  return event
}

/** The swipe: money is on hold and the row is pending. */
const hold = ({ id, amount, at, merchantData }) =>
  deliver('issuing_authorization.created', authorization({ id, amount, at, merchantData }))

/** The money actually moving, which closes the hold and settles the row. */
async function settle({ id, amount, at, merchantData }) {
  await deliver(
    'issuing_authorization.updated',
    authorization({ id, amount, at, status: 'closed', merchantData }),
  )
  await deliver(
    'issuing_transaction.created',
    transaction({
      id: id.replace('iauth', 'ipi'),
      amount,
      type: 'capture',
      at,
      authorizationId: id,
      merchantData,
    }),
  )
}

/** One purchase, all the way through. */
async function purchase(args) {
  await hold(args)
  await settle(args)
}

const MERCHANTS = {
  coffee: merchant('BLUE BOTTLE COFFEE', '5812', 'eating_places_restaurants'),
  grocer: merchant('CORNER MARKET', '5411', 'grocery_stores_supermarkets'),
  cab: merchant('CITY CAB CO', '4121', 'taxicabs_limousines'),
  airline: merchant('SKYWARD AIRLINES', '4511', 'airlines_air_carriers'),
  streaming: merchant('STREAMING CO', '5815', 'digital_goods_media'),
  software: merchant('DEV TOOLS INC', '5734', 'computer_software_stores'),
  power: merchant('POWER AND LIGHT', '4900', 'utilities'),
  pharmacy: merchant('CITY PHARMACY', '5912', 'drug_stores_and_pharmacies'),
  store: merchant('DEPARTMENT STORE', '5311', 'department_stores'),
}

async function seed() {
  console.log('Settled purchases across nine categories\n')
  await purchase({
    id: 'iauth_local_1',
    amount: 1899,
    at: daysAgo(1),
    merchantData: MERCHANTS.coffee,
  })
  await purchase({
    id: 'iauth_local_2',
    amount: 4250,
    at: daysAgo(2),
    merchantData: MERCHANTS.grocer,
  })
  await purchase({ id: 'iauth_local_3', amount: 1200, at: daysAgo(3), merchantData: MERCHANTS.cab })
  await purchase({
    id: 'iauth_local_4',
    amount: 32400,
    at: daysAgo(5),
    merchantData: MERCHANTS.airline,
  })
  await purchase({
    id: 'iauth_local_5',
    amount: 2900,
    at: daysAgo(6),
    merchantData: MERCHANTS.streaming,
  })
  await purchase({
    id: 'iauth_local_6',
    amount: 1500,
    at: daysAgo(8),
    merchantData: MERCHANTS.software,
  })
  await purchase({
    id: 'iauth_local_7',
    amount: 3400,
    at: daysAgo(9),
    merchantData: MERCHANTS.pharmacy,
  })

  console.log('\nOne outside "This month" but inside "90 days"')
  await purchase({
    id: 'iauth_local_8',
    amount: 12000,
    at: daysAgo(40),
    merchantData: MERCHANTS.power,
  })

  console.log('\nA refund big enough to turn its category net negative')
  await purchase({
    id: 'iauth_local_9',
    amount: 6000,
    at: daysAgo(4),
    merchantData: MERCHANTS.store,
  })
  await deliver(
    'issuing_transaction.created',
    transaction({
      id: 'ipi_local_refund',
      amount: 12000,
      type: 'refund',
      at: daysAgo(3),
      authorizationId: 'iauth_local_9',
      merchantData: MERCHANTS.store,
    }),
  )

  console.log('\nA refund belonging to no authorization')
  await deliver(
    'issuing_transaction.created',
    transaction({
      id: 'ipi_local_unlinked',
      amount: 2500,
      type: 'refund',
      at: daysAgo(2),
      merchantData: MERCHANTS.grocer,
    }),
  )

  console.log('\nA hold released instead of charged')
  await deliver(
    'issuing_authorization.created',
    authorization({
      id: 'iauth_local_expired',
      amount: 7500,
      at: daysAgo(2),
      merchantData: MERCHANTS.airline,
    }),
  )
  await deliver(
    'issuing_authorization.updated',
    authorization({
      id: 'iauth_local_expired',
      amount: 7500,
      at: daysAgo(2),
      status: 'expired',
      merchantData: MERCHANTS.airline,
    }),
  )

  console.log('\nTwo still pending')
  await deliver(
    'issuing_authorization.created',
    authorization({
      id: 'iauth_local_pending_1',
      amount: 5600,
      at: new Date(),
      merchantData: MERCHANTS.coffee,
    }),
  )
  await deliver(
    'issuing_authorization.created',
    authorization({
      id: 'iauth_local_pending_2',
      amount: 2200,
      at: new Date(),
      merchantData: MERCHANTS.cab,
    }),
  )
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function live() {
  console.log('One purchase every few seconds. Watch the feed.\n')
  for (const [i, [amount, merchantData]] of [
    [2400, MERCHANTS.coffee],
    [6800, MERCHANTS.grocer],
    [3300, MERCHANTS.cab],
  ].entries()) {
    // The pause is the point: the row should show up pending, then settle in place.
    const purchase = { id: `iauth_live_${Date.now()}_${i}`, amount, at: new Date(), merchantData }
    await hold(purchase)
    await sleep(2500)
    await settle(purchase)
    await sleep(2500)
  }
}

const commands = { seed, live }
const command = commands[process.argv[2]]

if (!command) {
  console.error(
    `Usage: node apps/api/scripts/deliver-webhooks.mjs <${Object.keys(commands).join('|')}>`,
  )
  process.exit(1)
}

console.log(`Delivering to ${url}\n`)
await command()
