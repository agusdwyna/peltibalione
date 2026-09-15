-- CreateTable
CREATE TABLE "age_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minAge" INTEGER NOT NULL,
    "maxAge" INTEGER,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "age_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "age_groups_code_key" ON "age_groups"("code");

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "ageGroupId" TEXT;

-- CreateIndex
CREATE INDEX "players_ageGroupId_idx" ON "players"("ageGroupId");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "age_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;