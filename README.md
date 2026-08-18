# Card activity

A cardholder dashboard for a Stripe Issuing card programme. A swipe appears in the feed
about a second after it happens, and the spend metrics move with it.

The dashboard is the easy half. The interesting half is underneath it: Stripe delivers
webhooks at least once, in no guaranteed order, and will redeliver an event that was
already handled. The write path is built so none of that shows. An event can arrive twice,
or late, or a capture can land before the authorization it settles, and the feed still
shows exactly one row for one purchase with the right number beside it.

![The dashboard](./docs/dashboard.png)

The architecture, the assumptions it rests on, and the reasoning behind each decision are
in [DESIGN.md](./DESIGN.md).

## Run it

Needs Docker and Node 20.19+, 22.12+ or 24+. No Stripe account is needed for this part.

```bash
cp .env.example .env      # the placeholder Stripe values are enough to boot
npm install
npm run db:up             # Postgres 16, host port 5433
npm run db:migrate
npm run db:seed           # the one cardholder this deployment serves
npm run db:demo           # sample activity, so the dashboard has something to show
npm run dev               # api on :3000, web on :5173
```

Open <http://localhost:5173>.

`npm run db:demo` is safe to re-run. It loads two pending authorizations, four spend
categories, a refund large enough to turn its category net negative, and one transaction
old enough to sit outside "This month" but inside "90 days". Between them that covers
every state the dashboard draws. Clear it whenever you like:

```bash
docker compose exec -T postgres psql -U karat -d karat_card_activity \
  -c "DELETE FROM cards WHERE stripe_id = 'ic_demo'"
```

## The API contract

The DTOs are the contract. They are zod schemas, `@nestjs/swagger` turns them into an
OpenAPI document, and the API's build writes it to
[`apps/api/openapi.json`](apps/api/openapi.json). Orval generates the web app's types and
TanStack Query hooks from that file, so nothing is typed twice and a change to a DTO shows
up as a compile error in the browser code.

The generated client is not committed, since it is derivative and every `dev`, `build` and
`typecheck` regenerates it. The spec is committed, because a diff on it is the clearest
signal that the client contract moved.

With the API running, the spec is also served at
<http://localhost:3000/api/v1/docs-json>, and Swagger UI at
<http://localhost:3000/api/v1/docs>.

## Commands

| Command                     | What it does                                      |
| --------------------------- | ------------------------------------------------- |
| `npm run dev`               | API and web together, both watching               |
| `npm run build`             | Builds both, and re-emits `openapi.json`          |
| `npm run typecheck`         | Type-checks both workspaces                       |
| `npm run format:check`      | Prettier, repo wide                               |
| `npm run db:up` / `db:down` | Starts or stops Postgres                          |
| `npm run db:reset`          | Drops the volume, so migrate and seed again after |
| `npm run db:migrate`        | Applies migrations                                |
| `npm run db:seed`           | Creates the configured cardholder                 |
| `npm run db:demo`           | Loads sample activity                             |
| `npm run db:studio`         | Prisma Studio, to browse the tables               |
