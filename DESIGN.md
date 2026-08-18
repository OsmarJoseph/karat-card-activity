# Karat take home: Real-time Card Activity + Insights

**Author:** _Osmar Joseph_

## Introduction

This document holds the design, architecture, and implementation plan for a page with real-time card activity and insights for cardholders. This is going to be the first page users see when they log in, so it needs to be intuitive, present what is most valuable and have a good visual user experience.

The card system is powered by the Stripe Issuing API, so the backend ingests Stripe Issuing webhooks into a normalized read model and pushes change notifications to the frontend over server-sent events (SSE). The dashboard serves aggregated spend data, and stays fresh within seconds of a swipe.

## Solution

Build a pipeline that ingests Stripe's webhooks into a local store, and point the dashboard only at that store.

The webhook endpoint checks the signature, saves the raw event, and then normalizes it in the same request, mapping each Stripe object into our own shape (cardholders, cards, authorizations, transactions) and upserting it into Postgres before responding to Stripe. There is no queue in v1 because that work is a single upsert of an object Stripe already handed us, and Stripe's own redelivery is the retry.

Postgres holds the store because every question the dashboard asks is relational and aggregate: the feed merges authorizations with transactions, while the metrics and the category breakdown are sums and group-bys over those same rows, each answered by one indexed query instead of a call out to Stripe.

Freshness rides on SSE, which fits because the data only flows one way and `EventSource` reconnects on its own, where a WebSocket would add framing, heartbeats and sticky sessions that are not needed for this case. The stream only says that something changed and the client refetches, so the page stays within seconds of a swipe without polling for it.

## Assumptions

1. **Stripe Issuing is the system of record.** Anything in our store that disagrees with Stripe is wrong by definition, so every conflict resolves in Stripe's favor.
2. **Webhook delivery is at-least-once, unordered, and replayable.** Stripe documents all three, which is why the write path has to be idempotent by construction.
3. **Stripe sends the full object on every event,** so a newer event can replace an older row wholesale and no field-level merging is ever needed.
4. **All card activity is in one currency, USD,** so amounts can be compared and summed without conversion.
5. **A user maps to a single cardholder** whose cards all belong to them, so "my activity" is always one cardholder's activity.

## Constraints / Limitations

- **Real authentication.** For this we will have one cardholder, whose id comes from server config, so there is no login or session.
- **Async ingestion.** Each webhook is normalized inside its own request. There is no async queue to process webhooks.
- **Reconciliation and drift detection.** Webhooks are the only ingestion path, so an event Stripe never redelivers stays missing.

## System Design and Architecture

### Diagram

```
              ┌────────────────────────────────────────────────┐
              │  STRIPE ISSUING                                │
              │  the card processor, and the system of record  │
              └─────────────────────┬──────────────────────────┘
                                    │  one webhook per card event
                                    ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  POST /webhooks/stripe                                       │
   │                                                              │
   │  1. verify Stripe's signature over the raw request body      │
   │  2. store the raw event, skipping any already seen           │
   │  3. translate the Stripe object into our own shape           │
   │  4. map the merchant category code to one of our categories  │
   │  5. save the row, keeping whichever version is newest        │
   │  6. notify connected browsers that something changed         │
   │                                                              │
   │  responds in ~10ms, or fails so that Stripe resends          │
   └────────────────────────────────┬─────────────────────────────┘
                                    ▼
               ┌─────────────────────────────────────────┐
               │  POSTGRES                               │
               │                                         │
               │  cardholders and their cards            │
               │  authorizations, meaning pending spend  │
               │  transactions, meaning settled spend    │
               │  every raw Stripe event received        │
               └────────────────────┬────────────────────┘
                                    ▼
  ┌──────────────────────────────────────────────────────────┐     ┌──────────────────────────────┐
  │  GET /activity           the feed, one page at a time    │     │  React dashboard             │
  │  GET /insights           metrics and category breakdown  │◀───▶│  feed, metric tiles, charts  │
  │  GET /activity/stream    a nudge whenever data changes   │     │  refetches when nudged       │
  └──────────────────────────────────────────────────────────┘     └──────────────────────────────┘
```

### Terminology

- **Authorization.** Stripe's record of the swipe itself, raised while the money is only on hold, and it stays pending until it either settles or is reversed.
- **Transaction.** Stripe's record of money actually moving, either a capture when the cardholder is charged or a refund when they are paid back, pointing at the authorization it came from when there was one.
- **Unlinked refund.** A refund that points at no authorization, which happens legitimately, so the schema has to allow it.
- **Activity item.** One row of the feed, which is either a settled transaction or an authorization that is still waiting to settle.
- **Settled spend.** Captures minus refunds.

### Data model

```
cardholders
  id          pk
  stripe_id   uniq
  name
  email       nullable, Stripe does not require one
  created_at

cards
  id             pk
  stripe_id      uniq
  cardholder_id  fk to cardholders
  last4
  brand
  status
  currency

authorizations
  id                 pk
  stripe_id          uniq
  card_id            fk to cards
  cardholder_id      fk to cardholders
  amount             integer, minor units
  currency
  status             pending | closed | reversed | expired
  merchant_name
  merchant_mcc       Stripe's raw category code
  merchant_category  Stripe's own label
  category           our mapped enum
  occurred_at
  last_event_at      guards the upsert
  raw                jsonb

transactions
  id                 pk
  stripe_id          uniq
  authorization_id   nullable, Stripe's id, no fk
  card_id            fk to cards
  cardholder_id      fk to cardholders
  amount             integer, signed: negative = refund
  currency
  type               capture | refund
  merchant_name
  merchant_mcc       Stripe's raw category code
  merchant_category  Stripe's own label
  category           our mapped enum
  occurred_at
  last_event_at      guards the upsert
  raw                jsonb

stripe_events
  id            pk, Stripe's event id
  type
  payload       jsonb
  received_at
  processed_at  null until handled
  attempts
  last_error
```

Decisions:

- **Money is stored as an integer count of the currency's smallest unit,** never as a float, since a rounding error in money is a bug waiting for the right input. A 32 bit integer caps a single row at about 21 million dollars, far above any card transaction, and it stays inside the range JavaScript represents exactly, so amounts need no wider type and no special handling to reach the browser.
- **Signed amounts on transactions,** with refunds stored negative, so settled spend is a plain sum and a refund cannot be left out of an aggregate.
- **`authorization_id` is nullable and carries no foreign key,** because unlinked refunds have no authorization at all, and a transaction can arrive before the authorization it names, which a constraint would reject.

---

## API Endpoints

Everything sits under `/api/v1`, with DTOs defined through `nestjs-zod`, the OpenAPI spec built from those same DTOs by `@nestjs/swagger`, and client hooks generated from the spec by Orval.

### `GET /activity`

Merged feed, newest first. Query: `cursor?`, `limit?` (default 25, max 100), `kind?` (`all|pending|settled`), `category?`

```jsonc
{
  "items": [
    {
      "id": "…",
      "kind": "authorization",
      "status": "pending",
      "amount": 4200,
      "currency": "usd",
      "formattedAmount": "$42.00",
      "merchantName": "BLUE BOTTLE COFFEE",
      "category": "food_drink",
      "categoryLabel": "Food & Drink",
      "occurredAt": "2026-08-17T14:22:09Z",
    },
    {
      "id": "…",
      "kind": "transaction",
      "status": "settled",
      "type": "capture",
      "amount": 1899,
      "…": "…",
    },
  ],
  "nextCursor": "eyJ0IjoiMjAyNi0wOC0xN1QxNDoyMjowOVoiLCJpIjoiYWJjIn0",
  "hasMore": true,
}
```

### `GET /insights`

Query: `period?` (`current_month|last_30d|last_90d`, default `current_month`)

```jsonc
{
  "period": { "start": "…", "end": "…", "label": "August 2026" },
  "metrics": {
    "settledSpend": 128450,
    "transactionCount": 37,
    "averageTransaction": 3471,
    "previousPeriodSettledSpend": 141200,
    "changePercent": -9.03,
  },
  "pending": { "count": 3, "amount": 8700 },
  "breakdown": [
    {
      "category": "food_drink",
      "label": "Food & Drink",
      "amount": 48200,
      "percent": 37.5,
      "count": 14,
    },
  ],
  "trend": {
    "bucket": "day",
    "points": [{ "startsAt": "2026-08-01T00:00:00Z", "amount": 0 }],
  },
}
```

### `GET /activity/stream`

SSE, emitting `{ type: 'activity.changed', cardholderId }`, with a heartbeat comment every 30 seconds so idle proxies do not close it.

### `POST /webhooks/stripe`

Raw body, verifying `stripe-signature`, and handling the created and updated events for authorizations, transactions and cards. Returns 200 whether the event is new or a duplicate, and 400 only on a bad signature. Unknown event types are logged and answered with a 200, never a 400, since a 400 makes Stripe retry on types we do not care about.

---

## Test Plan

The write path claims to be idempotent and order-independent, so those are the tests that get written: a duplicate event id producing one row, a transaction arriving before its authorization still showing one item, a stale update failing to regress a newer row, and an unlinked refund subtracting from settled spend. They run against Postgres in testcontainers, alongside unit tests for the category mapper, the cursor codec, and money formatting.

---

## Appendix A: Implementation Plan

**Stack:** NestJS 11 and TypeScript, Postgres with Prisma, SSE, React with Vite and visx for charts.

**Conventions:**

- **Monorepo:** npm workspaces with Turborepo.
- **Imports:** the `@/` path alias, with relative imports banned by ESLint.
- **Formatting:** Prettier at `semi: false, singleQuote: true, printWidth: 100`.
- **Database:** `postgres:16-alpine` on host port 5433.
- **API contract:** the nestjs-zod DTOs are the contract. The API's build emits them as `apps/api/openapi.json`, and Orval turns that into TanStack Query hooks, so the client's types come from the DTOs instead of being written a second time. The spec carries `/api/v1` as its server rather than on every path, which is what lets the browser hold the version in one base URL.
- **Tests:** Jest for the API, Vitest for the web app.

### Phases

0. **Scaffold.** Root `package.json` (workspaces), `turbo.json`, `tsconfig.base.json`, `docker-compose.yml`, `.env.example`
1. **Schema.** Prisma schema (Data model), initial migration, seed skeleton, Prisma module
2. **Processor port.** `CardProcessor` interface, `StripeCardProcessor` (list + pagination), config module (env + cardholder id)
3. **Webhook ingress.** Controller (raw body), signature guard, `stripe_events` repo, `rawBody: true` bootstrap
4. **Ingestion.** Authorization and transaction normalizers, category mapper, guarded upsert repo
5. **Read API.** Activity service, cursor codec, insights service, controllers, DTOs
6. **SSE.** `ActivityEventBus`, SSE controller
7. **Web scaffold.** Vite app, TanStack Query provider, Orval config, generated client, SSE hook
8. **Web UI.** Feed including its pending state, metric tiles, visx donut, visx trend bar, layout
9. **Tests and fixtures.** Recorded sandbox fixtures, `FakeCardProcessor`, the integration suite
10. **Docs.** This doc, `README.md` (setup and demo script), project `CLAUDE.md`
