#!/bin/sh
set -eu

attempt=1
max_attempts="${DB_MIGRATION_RETRIES:-10}"

echo "Applying database migrations..."
until ./node_modules/.bin/prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database migration failed after ${max_attempts} attempts."
    exit 1
  fi

  attempt=$((attempt + 1))
  echo "Database is not ready; retrying migration (${attempt}/${max_attempts}) in 3 seconds..."
  sleep 3
done

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "Seeding initial application data..."
  ./node_modules/.bin/prisma db seed
fi

echo "Starting PELTI Bali One on port ${PORT:-4000}..."
exec node dist/index.js
