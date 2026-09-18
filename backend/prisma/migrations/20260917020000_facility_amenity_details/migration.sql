-- §4 Sarana & Prasarana naik dari array kode menjadi tabel tersendiri agar tiap
-- fasilitas bisa punya deskripsi dan hingga 5 foto. Urutan disusun manual:
-- tabel baru dibuat dan data lama dipindahkan LEBIH DULU, kolom array baru
-- dibuang setelahnya, supaya tidak ada data yang hilang.

-- CreateTable
CREATE TABLE "facility_amenities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customName" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "facilityId" TEXT,
    "facilitySubmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facility_amenities_facilityId_idx" ON "facility_amenities"("facilityId");

-- CreateIndex
CREATE INDEX "facility_amenities_facilitySubmissionId_idx" ON "facility_amenities"("facilitySubmissionId");

-- AddForeignKey
ALTER TABLE "facility_amenities" ADD CONSTRAINT "facility_amenities_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_amenities" ADD CONSTRAINT "facility_amenities_facilitySubmissionId_fkey" FOREIGN KEY ("facilitySubmissionId") REFERENCES "facility_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "facilityAmenityId" TEXT;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_facilityAmenityId_fkey" FOREIGN KEY ("facilityAmenityId") REFERENCES "facility_amenities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Pindahkan sarana lama (array kode) menjadi baris tersendiri. Urutan dalam
-- array dipertahankan lewat ordinality agar tampilannya tidak berubah acak.
INSERT INTO "facility_amenities" ("id", "code", "customName", "description", "sortOrder", "facilityId", "createdAt", "updatedAt")
SELECT gen_random_uuid(),
       amenity.code,
       CASE WHEN amenity.code = 'LAINNYA' THEN f."amenityOther" END,
       NULL,
       amenity.ordinality - 1,
       f.id,
       now(),
       now()
FROM "facilities" f,
     LATERAL unnest(f."amenities") WITH ORDINALITY AS amenity(code, ordinality);

INSERT INTO "facility_amenities" ("id", "code", "customName", "description", "sortOrder", "facilitySubmissionId", "createdAt", "updatedAt")
SELECT gen_random_uuid(),
       amenity.code,
       CASE WHEN amenity.code = 'LAINNYA' THEN s."amenityOther" END,
       NULL,
       amenity.ordinality - 1,
       s.id,
       now(),
       now()
FROM "facility_submissions" s,
     LATERAL unnest(s."amenities") WITH ORDINALITY AS amenity(code, ordinality);

-- AlterTable — kolom lama baru boleh dibuang setelah datanya dipindahkan
ALTER TABLE "facilities" DROP COLUMN "amenities",
DROP COLUMN "amenityOther";

-- AlterTable
ALTER TABLE "facility_submissions" DROP COLUMN "amenities",
DROP COLUMN "amenityOther";
