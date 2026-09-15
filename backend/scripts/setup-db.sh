#!/usr/bin/env bash
# Creates the database, runs migrations, and seeds dev data.
# Usage: bash scripts/setup-db.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Running prisma migrate dev..."
npx prisma migrate dev --name init

echo "→ Seeding districts and central admin..."
npx prisma db seed

echo "→ Generating client..."
npx prisma generate

echo "✅ Database ready."
