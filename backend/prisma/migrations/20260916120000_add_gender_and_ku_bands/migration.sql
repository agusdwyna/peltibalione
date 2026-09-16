-- Add Gender enum + gender-aware age group bands (PRD §24).
CREATE TYPE "Gender" AS ENUM ('PUTRA', 'PUTRI');

ALTER TABLE "persons" ADD COLUMN IF NOT EXISTS "gender" "Gender";
ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "gender" "Gender";
ALTER TABLE "age_groups" ADD COLUMN IF NOT EXISTS "gender" "Gender";

-- KU 8 campur: usia <= 8, tanpa gender.
UPDATE "age_groups" SET "minAge" = 0, "maxAge" = 8, "gender" = NULL WHERE "code" = 'KU 8';

-- KU 10–18 per gender PA/PI.
UPDATE "age_groups" SET "minAge" = 9, "maxAge" = 10, "gender" = 'PUTRI' WHERE "code" = 'KU 10 PI';
UPDATE "age_groups" SET "minAge" = 9, "maxAge" = 10, "gender" = 'PUTRA' WHERE "code" = 'KU 10 PA';
UPDATE "age_groups" SET "minAge" = 11, "maxAge" = 12, "gender" = 'PUTRI' WHERE "code" = 'KU 12 PI';
UPDATE "age_groups" SET "minAge" = 11, "maxAge" = 12, "gender" = 'PUTRA' WHERE "code" = 'KU 12 PA';
UPDATE "age_groups" SET "minAge" = 13, "maxAge" = 14, "gender" = 'PUTRA' WHERE "code" = 'KU 14 PA';
UPDATE "age_groups" SET "minAge" = 13, "maxAge" = 14, "gender" = 'PUTRI' WHERE "code" = 'KU 14 PI';
UPDATE "age_groups" SET "minAge" = 15, "maxAge" = 16, "gender" = 'PUTRI' WHERE "code" = 'KU 16 PI';
UPDATE "age_groups" SET "minAge" = 15, "maxAge" = 16, "gender" = 'PUTRA' WHERE "code" = 'KU 16 PA';
UPDATE "age_groups" SET "minAge" = 17, "maxAge" = 18, "gender" = 'PUTRI' WHERE "code" = 'KU 18 PI';
UPDATE "age_groups" SET "minAge" = 17, "maxAge" = 18, "gender" = 'PUTRA' WHERE "code" = 'KU 18 PA';
