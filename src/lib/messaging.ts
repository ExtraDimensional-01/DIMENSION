import { db } from "@/lib/db";

/**
 * Who's allowed to START a new conversation with whom:
 *  - viewer   -> producer  (allowed)
 *  - producer -> producer  (allowed)
 *  - anyone   -> viewer    (only if that viewer already messaged them first —
 *                           i.e. this is a reply within an existing thread)
 * Replies within an existing thread are always allowed once it exists.
 */
export async function canMessage(senderId: string, recipientId: string): Promise<boolean> {
  if (senderId === recipientId) return false;

  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: { role: true },
  });
  if (!recipient) return false;

  if (recipient.role === "producer") return true;

  const priorMessage = await db.message.findFirst({
    where: {
      OR: [
        { senderId, recipientId },
        { senderId: recipientId, recipientId: senderId },
      ],
    },
    select: { id: true },
  });
  return !!priorMessage;
}
