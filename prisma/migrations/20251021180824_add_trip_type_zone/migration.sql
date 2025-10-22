-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "type" TEXT;
ALTER TABLE "Trip" ADD COLUMN "zone" TEXT;

-- CreateIndex
CREATE INDEX "Rate_type_idx" ON "Rate"("type");

-- CreateIndex
CREATE INDEX "Rate_zone_idx" ON "Rate"("zone");
