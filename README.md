# Card activity

A cardholder activity dashboard backed by Stripe Issuing. It shows a feed of card spend, a
small set of metrics over the selected period, and a breakdown by merchant category, all
served from a local store that Stripe's webhooks keep current, so new activity reaches the
page within a few seconds of the swipe.

![The dashboard](./docs/dashboard.png)

The architecture, the assumptions it rests on, and the reasoning behind each decision are
in [DESIGN.md](./DESIGN.md).

## Run it

Needs Docker and Node 20.19+, 22.12+ or 24+. No Stripe account is needed at any point.

```bash
cp .env.example .env      # the placeholders are enough, nothing to fill in
npm install
npm run db:generate       # Prisma client, which the seed imports
npm run db:up             # Postgres 16, host port 5433
npm run db:migrate
npm run db:seed           # the one cardholder this deployment serves
npm run dev               # api on :3000, web on :5173
```

Open <http://localhost:5173>, then fill it from a second shell, since `dev` keeps the
first one:

```bash
npm run webhook:seed      # sample activity, delivered as signed webhooks
```

That fills the dashboard the same way production does, by posting signed events at the
webhook endpoint.

To watch it update live, one purchase at a time, each row landing pending and settling in
place a few seconds later:

```bash
npm run webhook:live
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
| `npm run db:generate`       | Prisma client, from `schema.prisma`               |
| `npm run db:migrate`        | Applies migrations                                |
| `npm run db:seed`           | Creates the configured cardholder                 |
| `npm run webhook:seed`      | Sample activity, as signed webhooks               |
| `npm run webhook:live`      | Paced purchases, to watch the feed move           |
| `npm run db:studio`         | Prisma Studio, to browse the tables               |
