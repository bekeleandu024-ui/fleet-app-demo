/*
  Warnings:

  - You are about to drop the `RateSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `license` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `driver` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Trip` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Made the column `type` on table `Rate` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "RateSetting_rateKey_category_key";

-- DropIndex
DROP INDEX "RateSetting_category_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RateSetting";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Handling" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" DECIMAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "homeBase" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "licenseNumber" TEXT,
    "licenseJurisdiction" TEXT,
    "licenseClass" TEXT,
    "licenseEndorsements" JSONB DEFAULT '[]',
    "licenseExpiresAt" DATETIME,
    "medicalExpiresAt" DATETIME,
    "drugTestDate" DATETIME,
    "mvrDate" DATETIME,
    "payType" TEXT,
    "hourlyRate" DECIMAL,
    "cpmRate" DECIMAL,
    "deductionsProfileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "inactiveReason" TEXT,
    "inactiveAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Driver" (
    "id",
    "name",
    "homeBase",
    "active",
    "licenseClass"
)
SELECT
    "id",
    "name",
    "homeBase",
    "active",
    "license"
FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
CREATE INDEX "Driver_active_idx" ON "Driver"("active");
CREATE UNIQUE INDEX "Driver_licenseNumber_licenseJurisdiction_key" ON "Driver"("licenseNumber", "licenseJurisdiction");
CREATE TABLE "new_Rate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "zone" TEXT,
    "fixedCPM" DECIMAL NOT NULL DEFAULT 0,
    "wageCPM" DECIMAL NOT NULL DEFAULT 0,
    "addOnsCPM" DECIMAL NOT NULL DEFAULT 0,
    "rollingCPM" DECIMAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Rate" ("addOnsCPM", "fixedCPM", "id", "rollingCPM", "type", "wageCPM", "zone") SELECT "addOnsCPM", "fixedCPM", "id", "rollingCPM", "type", "wageCPM", "zone" FROM "Rate";
DROP TABLE "Rate";
ALTER TABLE "new_Rate" RENAME TO "Rate";
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "driverId" TEXT,
    "unitId" TEXT,
    "driver" TEXT,
    "unit" TEXT,
    "type" TEXT,
    "zone" TEXT,
    "tripStart" DATETIME,
    "tripEnd" DATETIME,
    "weekStart" DATETIME,
    "miles" DECIMAL,
    "revenue" DECIMAL,
    "fixedCPM" DECIMAL,
    "wageCPM" DECIMAL,
    "addOnsCPM" DECIMAL,
    "rollingCPM" DECIMAL,
    "totalCPM" DECIMAL,
    "totalCost" DECIMAL,
    "profit" DECIMAL,
    "marginPct" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'Created',
    "rateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trip_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trip" (
    "id",
    "orderId",
    "driverId",
    "unitId",
    "driver",
    "unit",
    "type",
    "zone",
    "tripStart",
    "tripEnd",
    "weekStart",
    "miles",
    "revenue",
    "fixedCPM",
    "wageCPM",
    "addOnsCPM",
    "rollingCPM",
    "totalCPM",
    "totalCost",
    "profit",
    "marginPct",
    "status",
    "rateId",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "orderId",
    "driverId",
    "unitId",
    "driver",
    "unit",
    "type",
    "zone",
    "tripStart",
    "tripEnd",
    "weekStart",
    "miles",
    "revenue",
    "fixedCPM",
    "wageCPM",
    "addOnsCPM",
    "rollingCPM",
    "totalCPM",
    "totalCost",
    "profit",
    "marginPct",
    "status",
    "rateId",
    "createdAt",
    "updatedAt"
FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE INDEX "Trip_weekStart_idx" ON "Trip"("weekStart");
CREATE INDEX "Trip_status_idx" ON "Trip"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "List_slug_key" ON "List"("slug");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Unit_active_idx" ON "Unit"("active");
