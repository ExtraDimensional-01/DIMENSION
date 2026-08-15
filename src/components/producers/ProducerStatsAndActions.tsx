"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Settings } from "lucide-react";
import { FollowButton } from "@/components/producers/FollowButton";
import { UserListModal } from "@/components/producers/UserListModal";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";

export function ProducerStatsAndActions({
  producerId,
  producerName,
  beatCount,
  initialFollowerCount,
  followingCount,
  salesCount,
  initialIsFollowing,
  isOwner,
  canMessage,
}: {
  producerId: string;
  producerName: string;
  beatCount: number;
  initialFollowerCount: number;
  followingCount: number;
  salesCount: number;
  initialIsFollowing: boolean;
  isOwner: boolean;
  canMessage: boolean;
}) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [ownFollowingCount, setOwnFollowingCount] = useState(followingCount);
  const [modalOpen, setModalOpen] = useState<"followers" | "following" | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <StatItem label="Beats" value={beatCount} />
        <StatButton label="Followers" value={followerCount} onClick={() => setModalOpen("followers")} />
        <StatButton label="Following" value={ownFollowingCount} onClick={() => setModalOpen("following")} />
        {salesCount > 0 && <StatItem label="Sales" value={salesCount} />}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {!isOwner && (
          <FollowButton
            producerId={producerId}
            initialIsFollowing={initialIsFollowing}
            onFollowChange={(_following, count) => setFollowerCount(count)}
          />
        )}
        {canMessage && (
          <Link
            href={`/messages/${producerId}`}
            className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-muted-2"
          >
            <MessageSquare size={14} />
            Message
          </Link>
        )}
        <CopyLinkButton
          path={`/producers/${producerId}`}
          label="Share"
          shareTitle={`${producerName} on DIMENSION`}
        />
        {isOwner && (
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-muted-2"
          >
            <Settings size={14} />
            Edit profile
          </Link>
        )}
      </div>

      {modalOpen && (
        <UserListModal
          producerId={producerId}
          kind={modalOpen}
          title={modalOpen === "followers" ? "Followers" : "Following"}
          emptyTitle={modalOpen === "followers" ? "No followers yet" : "Not following anyone yet"}
          emptyBody={modalOpen === "followers" ? "Build your dimension." : "Beats they follow show up here."}
          onClose={() => setModalOpen(null)}
          onRowFollowChange={
            isOwner ? (following) => setOwnFollowingCount((c) => c + (following ? 1 : -1)) : undefined
          }
        />
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-left">
      <p className="font-display text-lg font-bold leading-none text-foreground">{value.toLocaleString()}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-2">{label}</p>
    </div>
  );
}

function StatButton({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group text-left">
      <p className="font-display text-lg font-bold leading-none text-foreground transition group-hover:text-accent">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-2 transition group-hover:text-accent/70">
        {label}
      </p>
    </button>
  );
}
