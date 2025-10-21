-- CreateTable
CREATE TABLE "Trip" (
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
    CONSTRAINT "Trip_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "at" DATETIME NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
