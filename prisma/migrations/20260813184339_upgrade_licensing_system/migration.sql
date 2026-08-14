-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_beat_licenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "terms" TEXT NOT NULL DEFAULT '',
    "fileKey" TEXT NOT NULL,
    "fileFormat" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "includedFormats" TEXT NOT NULL DEFAULT '[]',
    "commercialUse" BOOLEAN NOT NULL DEFAULT true,
    "distributionAllowed" BOOLEAN NOT NULL DEFAULT true,
    "musicVideoAllowed" BOOLEAN NOT NULL DEFAULT true,
    "performanceAllowed" BOOLEAN NOT NULL DEFAULT true,
    "socialMediaAllowed" BOOLEAN NOT NULL DEFAULT true,
    "streamLimit" INTEGER,
    "salesLimit" INTEGER,
    "creditRequired" BOOLEAN NOT NULL DEFAULT false,
    "creditText" TEXT NOT NULL DEFAULT '',
    "otherRestrictions" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "beatId" TEXT NOT NULL,
    CONSTRAINT "beat_licenses_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "beats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_beat_licenses" ("beatId", "createdAt", "fileFormat", "fileKey", "fileSize", "id", "isExclusive", "name", "priceCents", "sortOrder", "terms", "updatedAt") SELECT "beatId", "createdAt", "fileFormat", "fileKey", "fileSize", "id", "isExclusive", "name", "priceCents", "sortOrder", "terms", "updatedAt" FROM "beat_licenses";
DROP TABLE "beat_licenses";
ALTER TABLE "new_beat_licenses" RENAME TO "beat_licenses";
CREATE INDEX "beat_licenses_beatId_idx" ON "beat_licenses"("beatId");

CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "licenseSnapshot" TEXT NOT NULL,
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

-- Data backfill for existing orders: generate a unique order number and a
-- best-effort licenseSnapshot built from the CURRENT (now-migrated) license
-- row, since no historical snapshot exists for orders placed before this
-- migration. All orders placed from now on get their snapshot written at
-- purchase time by the application and it will never be touched again.
INSERT INTO "new_orders" ("beatId", "buyerId", "confirmedAt", "createdAt", "id", "licenseId", "paymentMethod", "priceCents", "sellerId", "status", "updatedAt", "orderNumber", "licenseSnapshot")
SELECT
  o."beatId", o."buyerId", o."confirmedAt", o."createdAt", o."id", o."licenseId", o."paymentMethod", o."priceCents", o."sellerId", o."status", o."updatedAt",
  'DIM-' || upper(hex(randomblob(4))),
  json_object(
    'name', bl."name",
    'priceCents', bl."priceCents",
    'isExclusive', json(CASE WHEN bl."isExclusive" THEN 'true' ELSE 'false' END),
    'includedFormats', json(bl."includedFormats"),
    'commercialUse', json(CASE WHEN bl."commercialUse" THEN 'true' ELSE 'false' END),
    'distributionAllowed', json(CASE WHEN bl."distributionAllowed" THEN 'true' ELSE 'false' END),
    'musicVideoAllowed', json(CASE WHEN bl."musicVideoAllowed" THEN 'true' ELSE 'false' END),
    'performanceAllowed', json(CASE WHEN bl."performanceAllowed" THEN 'true' ELSE 'false' END),
    'socialMediaAllowed', json(CASE WHEN bl."socialMediaAllowed" THEN 'true' ELSE 'false' END),
    'streamLimit', bl."streamLimit",
    'salesLimit', bl."salesLimit",
    'creditRequired', json(CASE WHEN bl."creditRequired" THEN 'true' ELSE 'false' END),
    'creditText', bl."creditText",
    'terms', bl."terms",
    'otherRestrictions', bl."otherRestrictions",
    'fileFormat', bl."fileFormat"
  )
FROM "orders" o
JOIN "beat_licenses" bl ON bl."id" = o."licenseId";

DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");
CREATE INDEX "orders_beatId_idx" ON "orders"("beatId");
CREATE INDEX "orders_licenseId_idx" ON "orders"("licenseId");
CREATE INDEX "orders_buyerId_idx" ON "orders"("buyerId");
CREATE INDEX "orders_sellerId_idx" ON "orders"("sellerId");
CREATE INDEX "orders_status_idx" ON "orders"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
