-- DropIndex
DROP INDEX "players_ageGroupId_idx";

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN     "ageGroup" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "whatsapp" TEXT;
