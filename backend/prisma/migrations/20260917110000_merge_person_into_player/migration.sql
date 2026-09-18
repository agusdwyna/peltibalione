-- Preserve player IDs, submissions, files and account ownership while flattening identity.
BEGIN;
LOCK TABLE "persons", "players", "users", "form_submissions" IN ACCESS EXCLUSIVE MODE;

-- Stop rather than silently discard an identity that cannot be mapped to a player.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "persons" p LEFT JOIN "players" pl ON pl."personId" = p."id" WHERE pl."id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot remove persons: unmapped identities exist. Resolve them before retrying migration.';
  END IF;
END $$;

ALTER TABLE "players"
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "birthPlace" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "gender" "Gender",
  ADD COLUMN "nik" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "instagram" TEXT,
  ADD COLUMN "whatsapp" TEXT;

UPDATE "players" pl SET
  "fullName" = p."fullName", "birthPlace" = p."birthPlace", "birthDate" = p."birthDate",
  "gender" = p."gender", "nik" = p."nik", "address" = p."address", "phone" = p."phone",
  "instagram" = p."instagram", "whatsapp" = p."whatsapp",
  "updatedAt" = GREATEST(pl."updatedAt", p."updatedAt")
FROM "persons" p WHERE pl."personId" = p."id";
ALTER TABLE "players" ALTER COLUMN "fullName" SET NOT NULL;
CREATE UNIQUE INDEX "players_nik_key" ON "players"("nik");

ALTER TABLE "users" ADD COLUMN "playerId" TEXT;
UPDATE "users" u SET "playerId" = pl."id" FROM "players" pl WHERE u."personId" = pl."personId";
CREATE UNIQUE INDEX "users_playerId_key" ON "users"("playerId");
ALTER TABLE "users" ADD CONSTRAINT "users_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users" DROP CONSTRAINT "users_personId_fkey";
ALTER TABLE "players" DROP CONSTRAINT "players_personId_fkey";
ALTER TABLE "users" DROP COLUMN "personId";
ALTER TABLE "players" DROP COLUMN "personId";
DROP TABLE "persons";

-- Rename the existing submission table in place; preserve all records and file links.
ALTER TABLE "form_submissions" RENAME TO "player_submissions";
ALTER TABLE "player_submissions" RENAME CONSTRAINT "form_submissions_pkey" TO "player_submissions_pkey";
ALTER TABLE "player_submissions" RENAME CONSTRAINT "form_submissions_formId_fkey" TO "player_submissions_formId_fkey";
ALTER TABLE "player_submissions" RENAME CONSTRAINT "form_submissions_playerId_fkey" TO "player_submissions_playerId_fkey";
ALTER INDEX "form_submissions_formId_status_idx" RENAME TO "player_submissions_formId_status_idx";
ALTER INDEX "form_submissions_nik_idx" RENAME TO "player_submissions_nik_idx";
COMMIT;
