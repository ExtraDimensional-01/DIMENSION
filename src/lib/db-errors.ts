import { Prisma } from "@prisma/client";

/**
 * True if `err` is a unique-constraint violation. Prisma's native query
 * engine reports this cleanly as PrismaClientKnownRequestError (P2002), but
 * the libSQL driver adapter used against Turso in production doesn't
 * translate SQLite errors the same way — it surfaces a
 * PrismaClientUnknownRequestError wrapping the raw "UNIQUE constraint
 * failed" SQLite message instead. Both shapes need to be checked.
 */
export function isUniqueConstraintError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return true;
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError && err.message.includes("UNIQUE constraint failed")) {
    return true;
  }
  return false;
}
