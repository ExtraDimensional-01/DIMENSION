import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

/**
 * Two modes, auto-selected by DATABASE_URL's scheme — same pattern as the
 * storage adapter in src/lib/storage.ts:
 *  - "file:..." (default): plain local SQLite file, no extra setup. Used in
 *    dev until a hosted database is configured.
 *  - "libsql://..." + DATABASE_AUTH_TOKEN: Turso (hosted, SQLite-compatible)
 *    over the network, via Prisma's libSQL driver adapter. This is what
 *    production on Vercel needs — Vercel's filesystem can't hold a SQLite
 *    file persistently.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const log = (process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]) as ("error" | "warn")[];

  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (url?.startsWith("libsql://") && authToken) {
    const adapter = new PrismaLibSql({ url, authToken });
    return new PrismaClient({ adapter, log });
  }

  return new PrismaClient({ log });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
