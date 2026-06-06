# HittaGira

An independent register of used guitars in Sweden — aggregates listings
from Blocket, Tradera, Musikbörsen, GuitarGeeks and DLX Music into one
editorial browsing experience.

Stack: Next.js 15 (App Router) · Turso (hosted libSQL/SQLite) · Drizzle
ORM · Tailwind 4 · Motion · TypeScript.

---

## Local setup

```bash
git clone https://github.com/lindholmpontus/HittaGira.git
cd HittaGira
npm install

# 1. Get a Turso DB
#    - Sign up at https://turso.tech (free, no card)
#    - Create a database (any region)
#    - Generate a Group/Database token under the DB's "Tokens" tab
#      → set access to Read & Write
#
# 2. Configure local env
cp .env.example .env.local
# → edit .env.local, paste in TURSO_DATABASE_URL and TURSO_AUTH_TOKEN

# 3. Initialize the DB
npm run db:migrate   # creates the schema
npm run db:seed      # populates the catalog of 14 makers + 60 models

# 4. Pull fresh data from every source (~5-10 min the first time)
npm run sync

# 5. Run the dev server
npm run dev
# → http://localhost:3000
```

## Project layout

```
app/                  Next.js routes (App Router)
  [manufacturer]/     Brand page + model pages
  sok/                Full-text search
  bevakade/           Watchlist (client-side via localStorage)
  api/
    ads/              Lookup ads by ID (used by watchlist)
    sync/             HTTP-triggered sync, gated by SYNC_TOKEN
components/           Card, logo, nav, watchlist button
lib/
  sources.ts          Source registry (id, label, colour)
  blocket.ts          Blocket adapter — unofficial REST API
  tradera.ts          Tradera adapter — extracts __NEXT_DATA__
  musikborsen.ts      Musikbörsen adapter — WP REST + per-page scrape
  guitargeeks.ts      GuitarGeeks adapter — WooCommerce Store API
  dlxmusic.ts         DLX Music adapter — Litium HTML scrape
  sync.ts             Orchestrates per-model fetches and DB upserts
  catalog.ts          Seed data: manufacturers, models, search queries
db/
  schema.ts           Drizzle schema (manufacturers, models, ads, …)
  client.ts           libSQL client + Drizzle binding
.github/workflows/
  sync.yml            Cron — runs sync every 30 min
public/
  logos/              Maker wordmarks
```

## Scripts

| command              | what it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Next.js dev server                                 |
| `npm run build`      | Production build                                   |
| `npm run start`      | Production server (after `build`)                  |
| `npm run db:migrate` | Apply Drizzle migrations to the Turso DB           |
| `npm run db:seed`    | Sync `lib/catalog.ts` into the DB (idempotent)     |
| `npm run sync`       | Pull fresh listings from every source              |

`npm run db:seed` is idempotent — it updates existing makers/models and
deletes any rows whose slug is no longer in `lib/catalog.ts` (ads cascade).

## Environment variables

See `.env.example` for the full list. The three that matter:

- `TURSO_DATABASE_URL` — your `libsql://...` URL from the Turso dashboard.
- `TURSO_AUTH_TOKEN` — a Read & Write group/database token from Turso.
- `SYNC_TOKEN` — Bearer token guarding `POST /api/sync`. Only relevant if
  you want to trigger syncs over HTTP. The GitHub Actions cron uses
  `TURSO_*` directly and skips this.

## Triggering sync remotely

Once deployed, kick off an extra sync via:

```bash
curl -X POST https://<your-host>/api/sync \
  -H "Authorization: Bearer $SYNC_TOKEN"
```

Returns `{ ok: true, stats: { … } }` on success. Or trigger the GitHub
Action workflow manually from the Actions tab.

## Deployment — Vercel + Turso

### 1. Push the repo to GitHub

Already done if you cloned this — otherwise create a repo and `git push`.

### 2. Sign up at https://vercel.com

Connect your GitHub account. No credit card required for the Hobby plan.

### 3. Import the repo

"Add New… → Project" → pick the repo → Vercel detects Next.js
automatically. Before clicking Deploy, set environment variables:

| name                  | value                                      |
| --------------------- | ------------------------------------------ |
| `TURSO_DATABASE_URL`  | from your Turso dashboard                  |
| `TURSO_AUTH_TOKEN`    | the R/W token you generated                |
| `SYNC_TOKEN`          | a random string (`openssl rand -hex 32`)   |

Click Deploy. First deploy is ~2 min.

### 4. Add the GitHub secrets for the sync cron

In your GitHub repo: **Settings → Secrets and variables → Actions →
"New repository secret"**. Add:

- `TURSO_DATABASE_URL` (same as Vercel)
- `TURSO_AUTH_TOKEN` (same as Vercel)

The workflow at `.github/workflows/sync.yml` will run every 30 minutes
and pull fresh listings into Turso. Vercel reads from Turso, so the live
site updates automatically.

### 5. (Optional) Custom domain

In Vercel: Project → Settings → Domains → "Add". Paste `hittagira.se`.
Vercel shows you the DNS records to add at your registrar. Cert
provisions automatically once DNS propagates (~1-30 min).

## Adding a new source

1. Implement `lib/<source>.ts` with an `Adapter` (id, label, async
   generator `search(query)`).
2. Add the source id, label and colour to `lib/sources.ts`.
3. Import the adapter and push it into `ADAPTERS` in `lib/sync.ts`.
4. `git push` — Vercel redeploys, next cron tick pulls from the new
   source.

## Adding a new manufacturer or model

Edit `lib/catalog.ts`, `git push`. Then trigger a seed + sync from your
local machine (`npm run db:seed && npm run sync`) or wait for the next
cron tick.

## Legal note

HittaGira aggregates publicly visible ads and links straight back to the
original listing on the source platform. It does not reproduce full ad
bodies, does not monetise, and respects polite rate limits. Each
platform's terms of service still apply — if a source asks the project
to stop, the source comes out of `lib/sync.ts`.
