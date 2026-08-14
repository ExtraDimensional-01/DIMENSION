import type { Metadata } from "next";
import { MessageThread } from "@/components/messages/MessageThread";

export const metadata: Metadata = { title: "Messages — DIMENSION" };

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <MessageThread userId={userId} />
    </div>
  );
}
