-- CreateTable
CREATE TABLE "RateSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rateKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "RateSetting_category_idx" ON "RateSetting"("category");

-- CreateIndex
CREATE UNIQUE INDEX "RateSetting_rateKey_category_key" ON "RateSetting"("rateKey", "category");
