"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import type { NotificationItem } from "@/types";
import { cn, formatRelativeDate } from "@/lib/utils";

export function NotificationBell({ initialUnreadCount = 0 }: { initialUnreadCount?: number }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!notifications) await load();
  }

  async function markRead(id: string) {
    const wasUnread = notifications?.find((n) => n.id === id)?.read === false;
    setNotifications((prev) => (prev ?? []).filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 z-50 mt-2 animate-fade-in overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/40 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-80">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-accent hover:text-accent-hover">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!notifications ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-muted-2" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-2">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "#"}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "block border-b border-border px-4 py-3 transition last:border-0 hover:bg-surface-hover",
                    !n.read && "bg-accent/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  </div>
                  {n.body && <p className="mt-0.5 text-xs text-muted">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-muted-2">{formatRelativeDate(n.createdAt)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
