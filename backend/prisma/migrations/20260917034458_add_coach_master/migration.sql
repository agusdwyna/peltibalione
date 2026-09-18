-- CreateEnum
CREATE TYPE "CoachGender" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "CoachStatus" AS ENUM ('AKTIF', 'TIDAK_AKTIF');

-- CreateEnum
CREATE TYPE "CoachAthleteCategory" AS ENUM ('JUNIOR', 'SENIOR', 'SEMUA_UMUR');

-- CreateEnum
CREATE TYPE "CoachSpecialization" AS ENUM ('TEKNIK', 'FISIK', 'TAKTIK', 'PERFORMANCE', 'FUNDAMENTAL', 'UMUM', 'LAINNYA');

-- CreateEnum
CREATE TYPE "CoachVerificationStatus" AS ENUM ('MENUNGGU', 'TERVERIFIKASI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "CoachSubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CREATED', 'REJECTED');

-- AlterEnum
ALTER TYPE "FormType" ADD VALUE 'COACH_REGISTRATION';

-- CreateTable
CREATE TABLE "coach_submissions" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "status" "CoachSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "fullName" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "gender" "CoachGender" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "coachStatus" "CoachStatus" NOT NULL DEFAULT 'AKTIF',
    "coachingSince" INTEGER,
    "clubName" TEXT,
    "athleteCategories" "CoachAthleteCategory"[],
    "activeAthletes" INTEGER,
    "specializations" "CoachSpecialization"[],
    "otherSpecialization" TEXT,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "instagram" TEXT,
    "acceptingNewAthletes" BOOLEAN NOT NULL DEFAULT false,
    "experience" TEXT,
    "notes" TEXT,
    "photoId" TEXT,
    "coachId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_certificates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "issuer" TEXT,
    "year" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "coachId" TEXT,
    "coachSubmissionId" TEXT,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaches" (
    "id" TEXT NOT NULL,
    "coachCode" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "gender" "CoachGender" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "coachStatus" "CoachStatus" NOT NULL DEFAULT 'AKTIF',
    "coachingSince" INTEGER,
    "clubName" TEXT,
    "athleteCategories" "CoachAthleteCategory"[],
    "activeAthletes" INTEGER,
    "specializations" "CoachSpecialization"[],
    "otherSpecialization" TEXT,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "instagram" TEXT,
    "acceptingNewAthletes" BOOLEAN NOT NULL DEFAULT false,
    "experience" TEXT,
    "notes" TEXT,
    "photoId" TEXT,
    "verificationStatus" "CoachVerificationStatus" NOT NULL DEFAULT 'MENUNGGU',
    "adminNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coach_submissions_photoId_key" ON "coach_submissions"("photoId");

-- CreateIndex
CREATE INDEX "coach_submissions_formId_status_idx" ON "coach_submissions"("formId", "status");

-- CreateIndex
CREATE INDEX "coach_submissions_nik_idx" ON "coach_submissions"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "coach_certificates_fileId_key" ON "coach_certificates"("fileId");

-- CreateIndex
CREATE INDEX "coach_certificates_coachId_idx" ON "coach_certificates"("coachId");

-- CreateIndex
CREATE INDEX "coach_certificates_coachSubmissionId_idx" ON "coach_certificates"("coachSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "coaches_coachCode_key" ON "coaches"("coachCode");

-- CreateIndex
CREATE UNIQUE INDEX "coaches_nik_key" ON "coaches"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "coaches_photoId_key" ON "coaches"("photoId");

-- CreateIndex
CREATE INDEX "coaches_districtId_verificationStatus_idx" ON "coaches"("districtId", "verificationStatus");

-- CreateIndex
CREATE INDEX "coaches_districtId_coachStatus_idx" ON "coaches"("districtId", "coachStatus");

-- AddForeignKey
ALTER TABLE "coach_submissions" ADD CONSTRAINT "coach_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "registration_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_submissions" ADD CONSTRAINT "coach_submissions_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_submissions" ADD CONSTRAINT "coach_submissions_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_certificates" ADD CONSTRAINT "coach_certificates_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_certificates" ADD CONSTRAINT "coach_certificates_coachSubmissionId_fkey" FOREIGN KEY ("coachSubmissionId") REFERENCES "coach_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_certificates" ADD CONSTRAINT "coach_certificates_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
