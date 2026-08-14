-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_beats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "bpm" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "audioKey" TEXT NOT NULL,
    "audioFormat" TEXT NOT NULL,
    "audioSize" INTEGER NOT NULL,
    "durationSec" REAL,
    "coverKey" TEXT,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "producerId" TEXT NOT NULL,
    CONSTRAINT "beats_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_beats" ("audioFormat", "audioKey", "audioSize", "bpm", "coverKey", "createdAt", "description", "durationSec", "genre", "id", "key", "playCount", "producerId", "title", "updatedAt") SELECT "audioFormat", "audioKey", "audioSize", "bpm", "coverKey", "createdAt", "description", "durationSec", "genre", "id", "key", "playCount", "producerId", "title", "updatedAt" FROM "beats";
DROP TABLE "beats";
ALTER TABLE "new_beats" RENAME TO "beats";
CREATE INDEX "beats_producerId_idx" ON "beats"("producerId");
CREATE INDEX "beats_genre_idx" ON "beats"("genre");
CREATE INDEX "beats_createdAt_idx" ON "beats"("createdAt");
CREATE INDEX "beats_isPublic_idx" ON "beats"("isPublic");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
