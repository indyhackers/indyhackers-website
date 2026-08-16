#!/bin/sh
# Container entrypoint: bring the database up to date, optionally seed it, then
# serve. Replaces the bare `pocketbase serve` ENTRYPOINT so that a fresh
# `pb/data` becomes a usable database without any manual steps.
set -e

PB=/usr/local/bin/pocketbase
DATA_DIR=/pb_data
HOOKS_DIR=/pb_hooks
MIGRATIONS_DIR=/pb_migrations

log() { echo "[entrypoint] $*"; }

# --- schema -----------------------------------------------------------------
# `serve --migrationsDir` would automigrate on its own, but seeding has to
# happen before the server starts accepting requests, and apply-mocks needs the
# collections to already exist. So apply migrations explicitly and in order.
# Already-applied migrations are skipped, so this is safe on every boot.
if [ "$PB_MIGRATE" = "off" ]; then
  log "PB_MIGRATE=off — skipping migrations"
else
  log "applying migrations"
  "$PB" migrate up --dir="$DATA_DIR" --migrationsDir="$MIGRATIONS_DIR"
fi

# --- seed data --------------------------------------------------------------
# Fixtures only. These include fake users and a deliberately unapproved "Bunk
# Job Title" record, so this must never run against production data.
if [ "$NODE_ENV" = "development" ] && [ "$PB_SEED" != "off" ]; then
  # apply-mocks reads $__hooks/mocks.json. That path is gitignored (it is
  # export-mocks output); the tracked copy is src/mocks/mocks.json, baked into
  # the image at /mocks.json. Only copy when absent so a local export made via
  # export-mocks is never clobbered.
  if [ ! -f "$HOOKS_DIR/mocks.json" ] && [ -f /mocks.json ]; then
    log "no $HOOKS_DIR/mocks.json — seeding from the copy baked into the image"
    cp /mocks.json "$HOOKS_DIR/mocks.json"
  fi

  if [ -f "$HOOKS_DIR/mocks.json" ]; then
    log "seeding fixtures (idempotent; existing records are skipped)"
    # Non-fatal: a stale snapshot missing a newly-required field should not
    # stop the server from coming up.
    "$PB" --hooksDir "$HOOKS_DIR" --dir "$DATA_DIR" apply-mocks \
      || log "seeding failed — continuing without fixtures"
  else
    log "no mocks.json found — skipping seed"
  fi
elif [ "$PB_SEED" = "off" ]; then
  log "PB_SEED=off — skipping seed"
fi

# --- serve ------------------------------------------------------------------
log "starting pocketbase"
exec "$PB" serve \
  --http=0.0.0.0:8090 \
  --dir="$DATA_DIR" \
  --publicDir=/pb_public \
  --hooksDir="$HOOKS_DIR" \
  --migrationsDir="$MIGRATIONS_DIR"
