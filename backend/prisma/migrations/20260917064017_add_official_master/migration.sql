-- CreateEnum
CREATE TYPE "OfficialRole" AS ENUM ('CHAIR_UMPIRE', 'LINE_UMPIRE', 'REFEREE', 'CHIEF_UMPIRE');

-- CreateEnum
CREATE TYPE "OfficialLevel" AS ENUM ('DAERAH', 'PROVINSI', 'NASIONAL', 'INTERNASIONAL');

-- CreateEnum
CREATE TYPE "OfficialStatus" AS ENUM ('AKTIF', 'TIDAK_AKTIF');

-- CreateEnum
CREATE TYPE "TournamentLevel" AS ENUM ('KABUPATEN_KOTA', 'PROVINSI', 'NASIONAL', 'INTERNASIONAL');

-- CreateEnum
CREATE TYPE "OfficialVerificationStatus" AS ENUM ('MENUNGGU', 'TERVERIFIKASI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "OfficialSubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CREATED', 'REJECTED');

-- AlterEnum
ALTER TYPE "FormType" ADD VALUE 'OFFICIAL_REGISTRATION';

-- CreateTable
CREATE TABLE "official_submissions" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "status" "OfficialSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "fullName" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "gender" "CoachGender" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "officialStatus" "OfficialStatus" NOT NULL DEFAULT 'AKTIF',
    "officiatingSince" INTEGER NOT NULL,
    "roles" "OfficialRole"[],
    "level" "OfficialLevel",
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "instagram" TEXT,
    "acceptingAssignments" BOOLEAN NOT NULL DEFAULT false,
    "experience" TEXT,
    "photoId" TEXT,
    "officialId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_certificates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "issuer" TEXT,
    "year" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "officialId" TEXT,
    "officialSubmissionId" TEXT,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_tournament_histories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "level" "TournamentLevel",
    "role" "OfficialRole",
    "location" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "officialId" TEXT,
    "officialSubmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_tournament_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officials" (
    "id" TEXT NOT NULL,
    "officialCode" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "gender" "CoachGender" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "officialStatus" "OfficialStatus" NOT NULL DEFAULT 'AKTIF',
    "officiatingSince" INTEGER NOT NULL,
    "roles" "OfficialRole"[],
    "level" "OfficialLevel",
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "instagram" TEXT,
    "acceptingAssignments" BOOLEAN NOT NULL DEFAULT false,
    "experience" TEXT,
    "photoId" TEXT,
    "verificationStatus" "OfficialVerificationStatus" NOT NULL DEFAULT 'MENUNGGU',
    "adminNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "officials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "official_submissions_photoId_key" ON "official_submissions"("photoId");

-- CreateIndex
CREATE INDEX "official_submissions_formId_status_idx" ON "official_submissions"("formId", "status");

-- CreateIndex
CREATE INDEX "official_submissions_nik_idx" ON "official_submissions"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "official_certificates_fileId_key" ON "official_certificates"("fileId");

-- CreateIndex
CREATE INDEX "official_certificates_officialId_idx" ON "official_certificates"("officialId");

-- CreateIndex
CREATE INDEX "official_certificates_officialSubmissionId_idx" ON "official_certificates"("officialSubmissionId");

-- CreateIndex
CREATE INDEX "official_tournament_histories_officialId_idx" ON "official_tournament_histories"("officialId");

-- CreateIndex
CREATE INDEX "official_tournament_histories_officialSubmissionId_idx" ON "official_tournament_histories"("officialSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "officials_officialCode_key" ON "officials"("officialCode");

-- CreateIndex
CREATE UNIQUE INDEX "officials_nik_key" ON "officials"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "officials_photoId_key" ON "officials"("photoId");

-- CreateIndex
CREATE INDEX "officials_districtId_verificationStatus_idx" ON "officials"("districtId", "verificationStatus");

-- CreateIndex
CREATE INDEX "officials_districtId_officialStatus_idx" ON "officials"("districtId", "officialStatus");

-- AddForeignKey
ALTER TABLE "official_submissions" ADD CONSTRAINT "official_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "registration_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_submissions" ADD CONSTRAINT "official_submissions_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_submissions" ADD CONSTRAINT "official_submissions_officialId_fkey" FOREIGN KEY ("officialId") REFERENCES "officials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_certificates" ADD CONSTRAINT "official_certificates_officialId_fkey" FOREIGN KEY ("officialId") REFERENCES "officials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_certificates" ADD CONSTRAINT "official_certificates_officialSubmissionId_fkey" FOREIGN KEY ("officialSubmissionId") REFERENCES "official_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_certificates" ADD CONSTRAINT "official_certificates_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_tournament_histories" ADD CONSTRAINT "official_tournament_histories_officialId_fkey" FOREIGN KEY ("officialId") REFERENCES "officials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_tournament_histories" ADD CONSTRAINT "official_tournament_histories_officialSubmissionId_fkey" FOREIGN KEY ("officialSubmissionId") REFERENCES "official_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officials" ADD CONSTRAINT "officials_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officials" ADD CONSTRAINT "officials_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
