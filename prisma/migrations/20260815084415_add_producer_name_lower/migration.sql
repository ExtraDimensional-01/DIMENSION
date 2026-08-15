/*
  Warnings:

  - Added the required column `producerNameLower` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "producerName" TEXT NOT NULL,
    "producerNameLower" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'producer',
    "bio" TEXT NOT NULL DEFAULT '',
    "profileImage" TEXT,
    "bannerImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_users" ("bannerImage", "bio", "createdAt", "deletedAt", "email", "id", "passwordHash", "producerName", "producerNameLower", "profileImage", "role", "updatedAt") SELECT "bannerImage", "bio", "createdAt", "deletedAt", "email", "id", "passwordHash", "producerName", LOWER(TRIM("producerName")), "profileImage", "role", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_producerNameLower_key" ON "users"("producerNameLower");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
