# syntax=docker/dockerfile:1

# ---- 1. deps + build ------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# better-sqlite3 needs a C++ toolchain to build its native binding
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build the Next.js standalone bundle. SKIP_ENV_VALIDATION isn't needed —
# we just don't run scripts that need a DB.
RUN npm run build

# Prune dev deps for the runtime layer
RUN npm prune --omit=dev

# ---- 2. runtime -----------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone bundle includes server.js + minimal node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# We still need the full project for `npm run sync` / `db:migrate` / `db:seed`
# from inside the container. Copy the rest in a layer that won't bust the
# standalone bundle's hash.
COPY --from=builder /app/node_modules /app/_full/node_modules
COPY --from=builder /app/scripts      /app/_full/scripts
COPY --from=builder /app/lib          /app/_full/lib
COPY --from=builder /app/db           /app/_full/db
COPY --from=builder /app/drizzle      /app/_full/drizzle
COPY --from=builder /app/drizzle.config.ts /app/_full/
COPY --from=builder /app/package.json      /app/_full/
COPY --from=builder /app/tsconfig.json     /app/_full/

EXPOSE 3000
CMD ["node", "server.js"]
