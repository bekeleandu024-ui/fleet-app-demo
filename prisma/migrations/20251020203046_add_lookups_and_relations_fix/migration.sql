-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "license" TEXT,
    "homeBase" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT,
    "homeBase" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT,
    "zone" TEXT,
    "fixedCPM" DECIMAL NOT NULL,
    "wageCPM" DECIMAL NOT NULL,
    "addOnsCPM" DECIMAL NOT NULL,
    "rollingCPM" DECIMAL NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "driver" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "tripStart" DATETIME,
    "tripEnd" DATETIME,
    "weekStart" DATETIME,
    "miles" DECIMAL NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "driverId" TEXT,
    "unitId" TEXT,
    "rateId" TEXT,
    CONSTRAINT "Trip_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trip_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("addOnsCPM", "createdAt", "driver", "fixedCPM", "id", "marginPct", "miles", "orderId", "profit", "revenue", "rollingCPM", "status", "totalCPM", "totalCost", "tripEnd", "tripStart", "unit", "wageCPM", "weekStart") SELECT "addOnsCPM", "createdAt", "driver", "fixedCPM", "id", "marginPct", "miles", "orderId", "profit", "revenue", "rollingCPM", "status", "totalCPM", "totalCost", "tripEnd", "tripStart", "unit", "wageCPM", "weekStart" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Driver_name_key" ON "Driver"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");
