# HittaGira

An independent register of used guitars in Sweden — aggregates listings
from Blocket, Tradera, Musikbörsen, GuitarGeeks and DLX Music into one
editorial browsing experience.

Stack: Next.js 15 (App Router) · SQLite via `better-sqlite3` · Drizzle ORM
· Tailwind 4 · Motion · TypeScript.

---

## Local setup

```bash
git clone https://github.com/lindholmpontus/HittaGira.git
cd HittaGira
npm install

# Configure local env
cp .env.example .env.local
# (the defaults in .env.example already work for local dev)

# Create the schema and seed the catalog of makers + models
npm run db:migrate
npm run db:seed

# Pull fresh data from all sources (~4 min — Musikbörsen fetches per item)
npm run sync

# Run the dev server
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
public/
  logos/              Maker wordmarks
  silhouettes/        Per-model SVG body silhouettes (optional)
```

## Scripts

| command             | what it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Next.js dev server with Turbopack                   |
| `npm run build`     | Production build                                    |
| `npm run start`     | Production server (after `build`)                   |
| `npm run db:migrate`| Apply Drizzle migrations to the SQLite file         |
| `npm run db:seed`   | Sync `lib/catalog.ts` into the DB (idempotent)      |
| `npm run sync`      | Pull fresh listings from every source               |

`npm run db:seed` is idempotent — it updates existing makers/models and
deletes any rows whose slug is no longer in `lib/catalog.ts` (ads cascade).

`npm run sync` takes ~4 minutes end-to-end because Musikbörsen requires
one HTTP request per listing for the price + image.

## Environment variables

See `.env.example` for the full list with defaults. The three that
matter:

- `DATABASE_URL` — path to the SQLite file, prefixed with `file:`. In
  production, point this at a persistent volume.
- `BLOCKET_API_BASE` — leave at the default unless self-hosting a
  mirror.
- `SYNC_TOKEN` — Bearer token guarding `POST /api/sync`. Generate a
  random string in production: `openssl rand -hex 32`.

## Triggering sync remotely

Once deployed, kick off a sync via:

```bash
curl -X POST https://<your-host>/api/sync \
  -H "Authorization: Bearer $SYNC_TOKEN"
```

Returns `{ ok: true, stats: { … } }` on success.

## Deployment

The site is dynamic Next.js + a SQLite file that needs to persist across
requests **and** be writable by the sync job. That rules out Vercel
serverless (ephemeral filesystem). Two options that work:

### Fly.io (recommended — free tier sufficient)

Fly.io supports persistent volumes, and a small VM is plenty here.

1. Install `flyctl` and `fly auth login`
2. `fly launch --no-deploy` — accept the defaults; this generates a
   `fly.toml`
3. Create a volume for the database:
   ```bash
   fly volumes create hittagira_data --size 1 --region arn
   ```
4. Mount it in `fly.toml`:
   ```toml
   [[mounts]]
   source = "hittagira_data"
   destination = "/data"
   ```
5. Set env vars:
   ```bash
   fly secrets set DATABASE_URL=file:/data/hittagira.db
   fly secrets set SYNC_TOKEN=$(openssl rand -hex 32)
   ```
6. `fly deploy`
7. SSH in once to seed and run the first sync:
   ```bash
   fly ssh console
   npm run db:migrate
   npm run db:seed
   npm run sync
   ```

For a recurring sync, schedule a Fly Machine that runs `npm run sync`
once an hour, or hit `/api/sync` from any external cron (cron-job.org,
GitHub Actions on schedule, etc.).

### A small VPS (Hetzner, DigitalOcean)

Roughly:

```bash
# on the VPS
git clone … && cd HittaGira
npm install && npm run build
# Write a .env.local with production values
sudo systemd … or pm2 start "npm run start"
# cron entry — every hour
0 * * * * cd /srv/hittagira && /usr/local/bin/npm run sync
```

Any host with a persistent disk works; Next.js standalone output is the
smallest footprint.

## Adding a new source

1. Implement `lib/<source>.ts` with an `Adapter` (id, label, async
   generator `search(query)`).
2. Add the source id, label and colour to `lib/sources.ts`.
3. Import the adapter and push it into `ADAPTERS` in `lib/sync.ts`.
4. Run `npm run sync`.

## Adding a new manufacturer or model

Edit `lib/catalog.ts`, then `npm run db:seed` and `npm run sync`.

## Legal note

HittaGira aggregates publicly visible ads and links straight back to the
original listing on the source platform. It does not reproduce full ad
bodies, does not monetise, and respects polite rate limits. Each
platform's terms of service still apply — if a source asks the project
to stop, the source comes out of `lib/sync.ts`.
