-- Akun multi-peran: satu akun dapat terhubung ke pemain, pelatih, dan wasit.
--
-- Sebelumnya `users` hanya punya `playerId`, sehingga pelatih dan wasit
-- terverifikasi tidak akan pernah bisa memiliki akun. Migrasi ini menyiapkan
-- tautan ke `coaches` dan `officials`, peran portalnya, serta tabel token
-- aktivasi sekali-pakai (pemilik akun menetapkan passwordnya sendiri).
--
-- Sengaja ditulis IDEMPOTEN (IF NOT EXISTS / penjaga pg_constraint).
-- Alasannya: sebagian database pengembang dibentuk lewat `prisma db push`,
-- yang menyinkronkan skema TANPA mencatat migrasi. Di database seperti itu
-- objek di bawah sudah ada, dan migrasi yang tidak idempoten akan gagal —
-- memaksa `migrate reset` yang menghapus seluruh data. Dengan penjaga ini,
-- database baru maupun yang sudah tersinkron sama-sama berhasil.
--
-- Perlu IF NOT EXISTS pada ADD VALUE: PostgreSQL 12 ke atas mengizinkannya,
-- dan migrasi lain di proyek ini juga sudah memakai pola yang sama.

-- AlterEnum — tambah peran portal pelatih & wasit
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COACH';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OFFICIAL';

-- AlterTable — tautkan akun ke data pelatih & wasit
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "coachId" TEXT,
ADD COLUMN IF NOT EXISTS "officialId" TEXT;

-- CreateTable — token aktivasi sekali-pakai
CREATE TABLE IF NOT EXISTS "account_activations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_activations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "account_activations_tokenHash_key" ON "account_activations"("tokenHash");
CREATE INDEX IF NOT EXISTS "account_activations_userId_idx" ON "account_activations"("userId");
-- Satu akun hanya boleh menaut ke satu pemain/pelatih/wasit.
CREATE UNIQUE INDEX IF NOT EXISTS "users_coachId_key" ON "users"("coachId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_officialId_key" ON "users"("officialId");

-- AddForeignKey
-- Constraint tidak punya "IF NOT EXISTS", jadi keberadaannya diperiksa lebih
-- dulu lewat pg_constraint.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_coachId_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_officialId_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_officialId_fkey" FOREIGN KEY ("officialId") REFERENCES "officials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_activations_userId_fkey') THEN
    ALTER TABLE "account_activations" ADD CONSTRAINT "account_activations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
