"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Check, Download, FileText, Loader2, Send, X } from "lucide-react";
import { initials, formatRelativeDate, formatPrice, cn } from "@/lib/utils";
import type { OrderInfo } from "@/types";

interface ThreadMessage {
  id: string;
  body: string;
  fromMe: boolean;
  createdAt: string;
  order: OrderInfo | null;
}

interface Participant {
  id: string;
  producerName: string;
  profileImageUrl: string | null;
  role: string;
}

export function MessageThread({ userId }: { userId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const myId = session?.user?.id;
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load(silent = false) {
    try {
      const res = await fetch(`/api/messages/${userId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setParticipant(data.participant);
      setMessages(data.messages ?? []);
      // This GET marks the other person's messages as read server-side, so
      // refresh the layout's server-rendered unread badge (Navbar/UserMenu)
      // to match. Skipped on silent polls to avoid refreshing every 5s.
      if (!silent) router.refresh();
    } catch {
      if (!silent) setNotFound(true);
    }
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send message");
        return;
      }
      setMessages((prev) => [...(prev ?? []), data.message]);
      setDraft("");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function handleOrderUpdate(updated: OrderInfo) {
    setMessages((prev) =>
      (prev ?? []).map((m) => (m.order?.id === updated.id ? { ...m, order: updated } : m))
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted">This user couldn&apos;t be found.</p>
        <Link href="/messages" className="text-sm font-medium text-accent hover:text-accent-hover">
          Back to messages
        </Link>
      </div>
    );
  }

  if (!participant || !messages) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin text-muted-2" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
        <Link
          href="/messages"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-foreground"
          aria-label="Back to messages"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-accent">
          {participant.profileImageUrl ? (
            <Image
              src={participant.profileImageUrl}
              alt=""
              fill
              sizes="36px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-accent-foreground">
              {initials(participant.producerName)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{participant.producerName}</p>
          <p className="text-xs capitalize text-muted-2">{participant.role}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-2">
            Say hello to {participant.producerName}.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex flex-col", m.fromMe ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                    m.fromMe
                      ? "rounded-br-sm bg-accent text-accent-foreground"
                      : "rounded-bl-sm bg-surface text-foreground"
                  )}
                >
                  {m.body}
                </div>
                {m.order && <OrderCard order={m.order} myId={myId} onUpdate={handleOrderUpdate} />}
                <span className="mt-1 text-[10px] text-muted-2">
                  {formatRelativeDate(m.createdAt)}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder={`Message ${participant.producerName}...`}
          className="input py-2.5"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
          aria-label="Send"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

function OrderCard({
  order,
  myId,
  onUpdate,
}: {
  order: OrderInfo;
  myId: string | undefined;
  onUpdate: (order: OrderInfo) => void;
}) {
  const [busy, setBusy] = useState<"confirm" | "decline" | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const isSeller = myId === order.sellerId;

  async function respond(action: "confirm" | "decline") {
    if (busy) return;
    setBusy(action);
    setCardError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCardError(data.error ?? "Something went wrong");
        return;
      }
      onUpdate(data.order);
    } catch {
      setCardError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-1.5 w-full max-w-[75%] rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">
          {order.beatTitle} <span className="font-normal text-muted-2">— {order.licenseName}</span>
        </p>
        <span className="text-xs font-semibold text-accent">{formatPrice(order.priceCents)}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted">Payment method: {order.paymentMethod}</p>

      {order.status === "pending" && isSeller && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => respond("confirm")}
            disabled={busy !== null}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
          >
            {busy === "confirm" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Yes, I&apos;ve received the payment — release it
          </button>
          <button
            type="button"
            onClick={() => respond("decline")}
            disabled={busy !== null}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:border-muted-2 disabled:opacity-50"
          >
            {busy === "decline" ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
            No, I haven&apos;t received it — decline
          </button>
        </div>
      )}

      {order.status === "pending" && !isSeller && (
        <p className="mt-2 text-xs text-muted-2">Waiting for the seller to confirm payment.</p>
      )}
      {order.status === "confirmed" && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-accent">Payment confirmed — unlocked.</p>
          {!isSeller && (
            <div className="flex items-center gap-1.5">
              <a
                href={`/api/orders/${order.id}/download`}
                className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent/25"
              >
                <Download size={11} />
                Download file
              </a>
              <a
                href={`/api/orders/${order.id}/license`}
                className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:border-muted-2"
              >
                <FileText size={11} />
                License (PDF)
              </a>
            </div>
          )}
        </div>
      )}
      {order.status === "declined" && (
        <p className="mt-2 text-xs font-medium text-danger">This order was declined.</p>
      )}
      {cardError && <p className="mt-2 text-xs text-danger">{cardError}</p>}
    </div>
  );
}
