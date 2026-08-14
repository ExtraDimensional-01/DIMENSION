-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "producerName" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "profileImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "beats" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "producerId" TEXT NOT NULL,
    CONSTRAINT "beats_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "beat_tags" (
    "beatId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("beatId", "tagId"),
    CONSTRAINT "beat_tags_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "beats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "beat_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "beats_producerId_idx" ON "beats"("producerId");

-- CreateIndex
CREATE INDEX "beats_genre_idx" ON "beats"("genre");

-- CreateIndex
CREATE INDEX "beats_createdAt_idx" ON "beats"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "beat_tags_tagId_idx" ON "beat_tags"("tagId");
