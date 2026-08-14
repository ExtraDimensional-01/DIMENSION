"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { initials, formatRelativeDate, cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface Conversation {
  participant: { id: string; producerName: string; profileImageUrl: string | null; role: string };
  lastMessage: { body: string; createdAt: string; fromMe: boolean };
  unreadCount: number;
}

export function MessagesInbox() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []))
      .catch(() => setConversations([]));
  }, []);

  if (conversations === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin text-muted-2" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No conversations yet"
        description="Message a producer from their profile to start a conversation."
      />
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
      {conversations.map((c) => (
        <Link
          key={c.participant.id}
          href={`/messages/${c.participant.id}`}
          className="flex items-center gap-3 bg-surface px-4 py-3 transition hover:bg-surface-hover"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-accent">
            {c.participant.profileImageUrl ? (
              <Image
                src={c.participant.profileImageUrl}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-accent-foreground">
                {initials(c.participant.producerName)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">
                {c.participant.producerName}
              </p>
              <span className="shrink-0 rounded-full bg-surface-hover px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-2">
                {c.participant.role}
              </span>
            </div>
            <p
              className={cn(
                "truncate text-xs",
                c.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-2"
              )}
            >
              {c.lastMessage.fromMe ? "You: " : ""}
              {c.lastMessage.body}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="text-[11px] text-muted-2">
              {formatRelativeDate(c.lastMessage.createdAt)}
            </span>
            {c.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground">
                {c.unreadCount > 9 ? "9+" : c.unreadCount}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
