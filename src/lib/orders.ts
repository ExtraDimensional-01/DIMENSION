import { db } from "@/lib/db";

function randomOrderNumber(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `DIM-${hex.toUpperCase()}`;
}

/** Generates a unique, human-friendly order number (e.g. "DIM-7K2M9XQP"), retrying on the astronomically rare collision. */
export async function generateOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomOrderNumber();
    const existing = await db.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new Error("Failed to generate a unique order number");
}

/** Beat ids the given user holds a CONFIRMED order for (full playback unlocked). */
export async function getUnlockedBeatIds(
  userId: string | null | undefined,
  beatIds: string[]
): Promise<Set<string>> {
  if (!userId || beatIds.length === 0) return new Set();
  const orders = await db.order.findMany({
    where: { buyerId: userId, status: "confirmed", beatId: { in: beatIds } },
    select: { beatId: true },
  });
  return new Set(orders.map((o) => o.beatId));
}

export async function isBeatUnlockedForUser(userId: string | null | undefined, beatId: string): Promise<boolean> {
  if (!userId) return false;
  const order = await db.order.findFirst({
    where: { buyerId: userId, beatId, status: "confirmed" },
    select: { id: true },
  });
  return !!order;
}
