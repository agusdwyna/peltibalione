-- Add player track records and certificate metadata.
CREATE TABLE "player_track_records" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventName" TEXT,
    "eventDate" TIMESTAMP(3),
    "category" TEXT,
    "result" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    CONSTRAINT "player_track_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "player_certificates" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "trackRecordId" TEXT,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "issuedAt" TIMESTAMP(3),
    "certificateNo" TEXT,
    "notes" TEXT,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    CONSTRAINT "player_certificates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "player_track_records_playerId_eventDate_idx" ON "player_track_records"("playerId", "eventDate");
CREATE INDEX "player_certificates_playerId_issuedAt_idx" ON "player_certificates"("playerId", "issuedAt");
CREATE UNIQUE INDEX "player_certificates_fileId_key" ON "player_certificates"("fileId");
CREATE INDEX "player_certificates_fileId_idx" ON "player_certificates"("fileId");

ALTER TABLE "player_track_records"
  ADD CONSTRAINT "player_track_records_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "player_certificates"
  ADD CONSTRAINT "player_certificates_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "player_certificates"
  ADD CONSTRAINT "player_certificates_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

