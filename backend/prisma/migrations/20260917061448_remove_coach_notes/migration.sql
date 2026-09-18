/*
  Warnings:

  - You are about to drop the column `notes` on the `coach_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `coaches` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "coach_submissions" DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "coaches" DROP COLUMN "notes";
