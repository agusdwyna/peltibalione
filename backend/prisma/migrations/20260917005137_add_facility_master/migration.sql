-- CreateEnum
CREATE TYPE "FacilityCourtType" AS ENUM ('OUTDOOR', 'INDOOR', 'SEMI_INDOOR');

-- CreateEnum
CREATE TYPE "FacilitySurface" AS ENUM ('HARD_COURT', 'CLAY', 'GRASS', 'SYNTHETIC');

-- CreateEnum
CREATE TYPE "FacilitySurfaceCondition" AS ENUM ('BAIK', 'CUKUP', 'PERLU_PERBAIKAN');

-- CreateEnum
CREATE TYPE "FacilityNetCondition" AS ENUM ('BAIK', 'CUKUP', 'RUSAK');

-- CreateEnum
CREATE TYPE "FacilityOperationalStatus" AS ENUM ('AKTIF', 'RENOVASI', 'TIDAK_AKTIF');

-- CreateEnum
CREATE TYPE "FacilityAccess" AS ENUM ('UMUM', 'ANGGOTA', 'KHUSUS');

-- CreateEnum
CREATE TYPE "FacilityVerificationStatus" AS ENUM ('MENUNGGU', 'TERVERIFIKASI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "FacilityGrade" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "FacilitySubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CREATED', 'REJECTED');

-- AlterEnum
ALTER TYPE "FormType" ADD VALUE 'FACILITY_REGISTRATION';

-- DropIndex
DROP INDEX "player_certificates_trackRecordId_idx";

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "facilityId" TEXT,
ADD COLUMN     "facilitySubmissionId" TEXT;

-- CreateTable
CREATE TABLE "facility_submissions" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "status" "FacilitySubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "mapsUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "courtCount" INTEGER NOT NULL,
    "courtType" "FacilityCourtType" NOT NULL,
    "surface" "FacilitySurface" NOT NULL,
    "courtLength" DOUBLE PRECISION,
    "courtWidth" DOUBLE PRECISION,
    "clearanceBack" DOUBLE PRECISION,
    "clearanceLeft" DOUBLE PRECISION,
    "clearanceRight" DOUBLE PRECISION,
    "surfaceCondition" "FacilitySurfaceCondition" NOT NULL,
    "hasLighting" BOOLEAN NOT NULL DEFAULT false,
    "lightCount" INTEGER,
    "netCondition" "FacilityNetCondition" NOT NULL,
    "amenities" TEXT[],
    "amenityOther" TEXT,
    "managerName" TEXT,
    "picName" TEXT,
    "picPhone" TEXT,
    "operationalStatus" "FacilityOperationalStatus" NOT NULL DEFAULT 'AKTIF',
    "openTime" TEXT,
    "closeTime" TEXT,
    "accessType" "FacilityAccess" NOT NULL DEFAULT 'UMUM',
    "hourlyRate" INTEGER,
    "coverPhotoId" TEXT,
    "facilityId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "facilityCode" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "mapsUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "courtCount" INTEGER NOT NULL,
    "courtType" "FacilityCourtType" NOT NULL,
    "surface" "FacilitySurface" NOT NULL,
    "courtLength" DOUBLE PRECISION,
    "courtWidth" DOUBLE PRECISION,
    "clearanceBack" DOUBLE PRECISION,
    "clearanceLeft" DOUBLE PRECISION,
    "clearanceRight" DOUBLE PRECISION,
    "surfaceCondition" "FacilitySurfaceCondition" NOT NULL,
    "hasLighting" BOOLEAN NOT NULL DEFAULT false,
    "lightCount" INTEGER,
    "netCondition" "FacilityNetCondition" NOT NULL,
    "amenities" TEXT[],
    "amenityOther" TEXT,
    "managerName" TEXT,
    "picName" TEXT,
    "picPhone" TEXT,
    "operationalStatus" "FacilityOperationalStatus" NOT NULL DEFAULT 'AKTIF',
    "openTime" TEXT,
    "closeTime" TEXT,
    "accessType" "FacilityAccess" NOT NULL DEFAULT 'UMUM',
    "hourlyRate" INTEGER,
    "coverPhotoId" TEXT,
    "verificationStatus" "FacilityVerificationStatus" NOT NULL DEFAULT 'MENUNGGU',
    "grade" "FacilityGrade",
    "adminNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facility_submissions_coverPhotoId_key" ON "facility_submissions"("coverPhotoId");

-- CreateIndex
CREATE INDEX "facility_submissions_formId_status_idx" ON "facility_submissions"("formId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_facilityCode_key" ON "facilities"("facilityCode");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_coverPhotoId_key" ON "facilities"("coverPhotoId");

-- CreateIndex
CREATE INDEX "facilities_districtId_verificationStatus_idx" ON "facilities"("districtId", "verificationStatus");

-- CreateIndex
CREATE INDEX "facilities_districtId_grade_idx" ON "facilities"("districtId", "grade");

-- AddForeignKey
ALTER TABLE "facility_submissions" ADD CONSTRAINT "facility_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "registration_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_submissions" ADD CONSTRAINT "facility_submissions_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_submissions" ADD CONSTRAINT "facility_submissions_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_facilitySubmissionId_fkey" FOREIGN KEY ("facilitySubmissionId") REFERENCES "facility_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
