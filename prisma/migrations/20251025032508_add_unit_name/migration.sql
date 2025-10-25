/*
  Warnings:

  - Added the required column `name` to the `Unit` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "homeBase" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Unit" ("active", "code", "homeBase", "id", "type", "name") SELECT "active", "code", "homeBase", "id", "type", "code" FROM "Unit";
DROP TABLE "Unit";
ALTER TABLE "new_Unit" RENAME TO "Unit";
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
