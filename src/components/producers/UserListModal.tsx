"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, Loader2, X } from "lucide-react";
import { initials } from "@/lib/utils";
import { FollowButton } from "@/components/producers/FollowButton";

interface ListUser {
  id: string;
  producerName: string;
  profileImageUrl: string | null;
  isFollowing: boolean;
  isSelf: boolean;
}

export function UserListModal({
  producerId,
  kind,
  title,
  emptyTitle,
  emptyBody,
  onClose,
  onRowFollowChange,
}: {
  producerId: string;
  kind: "followers" | "following";
  title: string;
  emptyTitle: string;
  emptyBody: string;
  onClose: () => void;
  onRowFollowChange?: (following: boolean) => void;
}) {
  const [users, setUsers] = useState<ListUser[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPage(targetPage: number) {
    try {
      const res = await fetch(`/api/producers/${producerId}/${kind}?page=${targetPage}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers((prev) => (targetPage === 1 ? data.users : [...(prev ?? []), ...data.users]));
      setHasMore(data.hasMore);
      setPage(targetPage);
      setError(null);
    } catch {
      setError("Couldn't load this list. Please try again.");
    }
  }

  useEffect(() => {
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producerId, kind]);

  async function handleLoadMore() {
    setLoadingMore(true);
    await loadPage(page + 1);
    setLoadingMore(false);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="cut-corner flex max-h-[80vh] w-full max-w-sm flex-col border border-border bg-surface shadow-[0_0_0_1px_rgba(155,77,255,0.15),0_24px_60px_-16px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="energy-line" />
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-2 transition hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {error && !users ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle size={20} className="text-danger" />
              <p className="text-sm text-muted">{error}</p>
            </div>
          ) : !users ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-muted-2" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-10 text-center">
              <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
              <p className="text-xs text-muted-2">{emptyBody}</p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-1">
                {users.map((u) => (
                  <li key={u.id}>
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-surface-hover">
                      <Link href={`/producers/${u.id}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-accent/20 ring-1 ring-white/10">
                          {u.profileImageUrl ? (
                            <Image src={u.profileImageUrl} alt="" fill sizes="36px" className="object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-accent">
                              {initials(u.producerName)}
                            </span>
                          )}
                        </div>
                        <span className="truncate text-sm font-medium text-foreground">{u.producerName}</span>
                      </Link>
                      {!u.isSelf && (
                        <FollowButton
                          producerId={u.id}
                          initialIsFollowing={u.isFollowing}
                          onFollowChange={onRowFollowChange ? (following) => onRowFollowChange(following) : undefined}
                          className="shrink-0 px-3 py-1.5 text-xs"
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <div className="flex justify-center py-3">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted transition hover:border-muted-2 hover:text-foreground disabled:opacity-60"
                  >
                    {loadingMore && <Loader2 size={12} className="animate-spin" />}
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
