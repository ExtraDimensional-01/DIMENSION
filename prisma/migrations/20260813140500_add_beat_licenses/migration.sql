-- CreateTable
CREATE TABLE "beat_licenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "terms" TEXT NOT NULL DEFAULT '',
    "fileKey" TEXT NOT NULL,
    "fileFormat" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "beatId" TEXT NOT NULL,
    CONSTRAINT "beat_licenses_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "beats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Data backfill: every beat that had a flat priceCents set under the old
-- single-price model gets one "Standard License" tier carrying that same
-- price and its existing audio file as the deliverable, so existing listings
-- and orders keep working under the new per-license model.
INSERT INTO "beat_licenses" ("id", "name", "priceCents", "terms", "fileKey", "fileFormat", "fileSize", "isExclusive", "sortOrder", "createdAt", "updatedAt", "beatId")
SELECT
  '31c17828-3408-4cd2-82b8-baf9fe4052ac' || '-' || "id",
  'Standard License',
  "priceCents",
  'Standard non-exclusive license.',
  "audioKey",
  "audioFormat",
  "audioSize",
  false,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  "id"
FROM "beats"
WHERE "priceCents" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_beats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "bpm" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "mood" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "audioKey" TEXT NOT NULL,
    "audioFormat" TEXT NOT NULL,
    "audioSize" INTEGER NOT NULL,
    "durationSec" REAL,
    "coverKey" TEXT,
    "waveformPeaks" TEXT,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "exclusiveSoldAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "producerId" TEXT NOT NULL,
    CONSTRAINT "beats_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_beats" ("audioFormat", "audioKey", "audioSize", "bpm", "coverKey", "createdAt", "description", "durationSec", "genre", "id", "isPublic", "key", "mood", "playCount", "producerId", "title", "updatedAt", "waveformPeaks") SELECT "audioFormat", "audioKey", "audioSize", "bpm", "coverKey", "createdAt", "description", "durationSec", "genre", "id", "isPublic", "key", "mood", "playCount", "producerId", "title", "updatedAt", "waveformPeaks" FROM "beats";
DROP TABLE "beats";
ALTER TABLE "new_beats" RENAME TO "beats";
CREATE INDEX "beats_producerId_idx" ON "beats"("producerId");
CREATE INDEX "beats_genre_idx" ON "beats"("genre");
CREATE INDEX "beats_mood_idx" ON "beats"("mood");
CREATE INDEX "beats_createdAt_idx" ON "beats"("createdAt");
CREATE INDEX "beats_isPublic_idx" ON "beats"("isPublic");
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "beatId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    CONSTRAINT "orders_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "beats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "orders_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "beat_licenses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_orders" ("beatId", "buyerId", "confirmedAt", "createdAt", "id", "paymentMethod", "priceCents", "sellerId", "status", "updatedAt", "licenseId")
SELECT "beatId", "buyerId", "confirmedAt", "createdAt", "id", "paymentMethod", "priceCents", "sellerId", "status", "updatedAt",
  (SELECT bl."id" FROM "beat_licenses" bl WHERE bl."beatId" = "orders"."beatId" LIMIT 1)
FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE INDEX "orders_beatId_idx" ON "orders"("beatId");
CREATE INDEX "orders_licenseId_idx" ON "orders"("licenseId");
CREATE INDEX "orders_buyerId_idx" ON "orders"("buyerId");
CREATE INDEX "orders_sellerId_idx" ON "orders"("sellerId");
CREATE INDEX "orders_status_idx" ON "orders"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "beat_licenses_beatId_idx" ON "beat_licenses"("beatId");
