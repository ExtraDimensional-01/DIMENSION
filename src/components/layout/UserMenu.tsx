"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronDown, LayoutDashboard, LogOut, MessageSquare, UploadCloud } from "lucide-react";
import { initials } from "@/lib/utils";

export function UserMenu({
  producerName,
  image,
  role,
  unreadCount = 0,
}: {
  producerName: string;
  image: string | null;
  role: string;
  unreadCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 transition hover:border-muted-2"
      >
        <div className="relative h-7 w-7 overflow-hidden rounded-full bg-accent">
          {image ? (
            <Image src={image} alt="" fill sizes="28px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-accent-foreground">
              {initials(producerName)}
            </div>
          )}
        </div>
        <span className="max-w-[120px] truncate text-sm font-medium">{producerName}</span>
        <ChevronDown size={14} className="text-muted-2" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 animate-fade-in overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/40">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground transition hover:bg-surface-hover"
            onClick={() => setOpen(false)}
          >
            <LayoutDashboard size={15} className="text-muted" />
            Dashboard
          </Link>
          {role === "producer" && (
            <Link
              href="/dashboard/upload"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground transition hover:bg-surface-hover"
              onClick={() => setOpen(false)}
            >
              <UploadCloud size={15} className="text-muted" />
              Upload a beat
            </Link>
          )}
          <Link
            href="/messages"
            className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-sm text-foreground transition hover:bg-surface-hover"
            onClick={() => setOpen(false)}
          >
            <span className="flex items-center gap-2.5">
              <MessageSquare size={15} className="text-muted" />
              Messages
            </span>
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <div className="h-px bg-border" />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-danger transition hover:bg-surface-hover"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
