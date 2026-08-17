# karat-card-activity

A cardholder dashboard for real-time card activity and spend insights, backed by Stripe Issuing. The design and implementation plan are in [design.md](./design.md).

## Demo

Needs Docker, Node 20+, the [Stripe CLI](https://docs.stripe.com/stripe-cli), and a Stripe sandbox key with Issuing enabled.

```bash
docker compose up -d                      # Postgres
npm run db:migrate && npm run db:seed     # schema + cardholder/card
npm run dev                               # api :3000, web :5173
stripe listen --api-key sk_test_… \
  --forward-to localhost:3000/api/v1/webhooks/stripe

# with the dashboard open, in another shell:
stripe post /v1/test_helpers/issuing/authorizations \
  -d card=ic_… -d amount=4200 -d "merchant_data[name]=BLUE BOTTLE"
#   row appears within ~1s, marked Pending, metrics unchanged

stripe post /v1/test_helpers/issuing/authorizations/iauth_…/capture
#   same row becomes Settled, metrics and breakdown update, still ONE row
```

That last assertion, **still one row**, is the whole design in one observation.
