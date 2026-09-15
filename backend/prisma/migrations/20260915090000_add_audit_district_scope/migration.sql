-- Add immutable district scope to audit records.
ALTER TABLE "audit_logs" ADD COLUMN "districtId" TEXT;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_districtId_fkey"
  FOREIGN KEY ("districtId") REFERENCES "districts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "audit_logs_districtId_timestamp_idx" ON "audit_logs"("districtId", "timestamp");
