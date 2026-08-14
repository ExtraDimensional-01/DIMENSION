import type { Metadata } from "next";
import { MessagesInbox } from "@/components/messages/MessagesInbox";

export const metadata: Metadata = { title: "Messages — DIMENSION" };

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <span className="kicker mb-2">Inbox</span>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">Messages</h1>
      </div>
      <MessagesInbox />
    </div>
  );
}
