"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function FollowButton({
  producerId,
  initialIsFollowing,
  onFollowChange,
  className,
}: {
  producerId: string;
  initialIsFollowing: boolean;
  onFollowChange?: (following: boolean, followerCount: number) => void;
  className?: string;
}) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);

  async function handleClick() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    setError(null);
    setLoading(true);
    const nextFollowing = !isFollowing;
    // Optimistic update, reconciled against the server response below.
    setIsFollowing(nextFollowing);

    try {
      const res = await fetch(`/api/producers/${producerId}/follow`, {
        method: nextFollowing ? "POST" : "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsFollowing(!nextFollowing);
        setError("Unable to follow producer. Please try again.");
        return;
      }
      setIsFollowing(data.following);
      onFollowChange?.(data.following, data.followerCount);
    } catch {
      setIsFollowing(!nextFollowing);
      setError("Unable to follow producer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-70",
          isFollowing
            ? "border border-border text-foreground hover:border-danger/50 hover:text-danger"
            : "glow-accent bg-accent text-accent-foreground hover:bg-accent-hover",
          className
        )}
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : isFollowing ? (
          hovering ? null : <Check size={15} />
        ) : (
          <UserPlus size={15} />
        )}
        {isFollowing ? (hovering ? "Unfollow" : "Following") : "Follow"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
