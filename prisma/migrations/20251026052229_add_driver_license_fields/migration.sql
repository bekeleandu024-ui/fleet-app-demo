/*
  Warnings:

  - You are about to alter the column `licenseEndorsements` on the `Driver` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
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
    "licenseEndorsements" TEXT NOT NULL DEFAULT '[]',
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Driver" ("active", "cpmRate", "createdAt", "deductionsProfileId", "drugTestDate", "email", "homeBase", "hourlyRate", "id", "inactiveAt", "inactiveReason", "licenseClass", "licenseEndorsements", "licenseExpiresAt", "licenseJurisdiction", "licenseNumber", "medicalExpiresAt", "mvrDate", "name", "payType", "phone", "status", "updatedAt") SELECT "active", "cpmRate", "createdAt", "deductionsProfileId", "drugTestDate", "email", "homeBase", "hourlyRate", "id", "inactiveAt", "inactiveReason", "licenseClass", "licenseEndorsements", "licenseExpiresAt", "licenseJurisdiction", "licenseNumber", "medicalExpiresAt", "mvrDate", "name", "payType", "phone", "status", "updatedAt" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
CREATE INDEX "Driver_active_idx" ON "Driver"("active");
CREATE UNIQUE INDEX "Driver_licenseNumber_licenseJurisdiction_key" ON "Driver"("licenseNumber", "licenseJurisdiction");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
