-- Link optional certificate evidence to the player's track record.
ALTER TABLE "player_certificates"
  ADD COLUMN "trackRecordId" TEXT;

ALTER TABLE "player_certificates"
  ADD CONSTRAINT "player_certificates_trackRecordId_fkey"
  FOREIGN KEY ("trackRecordId") REFERENCES "player_track_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "player_certificates_trackRecordId_idx" ON "player_certificates"("trackRecordId");
