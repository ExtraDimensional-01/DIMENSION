import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, MapPin, Star } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { collabPostInclude } from "@/lib/collab-query";
import { serializeCollabPost } from "@/lib/collab-serialize";
import { formatPrice, formatRelativeDate, initials } from "@/lib/utils";
import { CollabStatusBadge } from "@/components/collabs/CollabStatusBadge";
import { CollabFileList } from "@/components/collabs/CollabFileList";
import { ApplyButton } from "@/components/collabs/ApplyButton";
import { PostOwnerControls } from "@/components/collabs/PostOwnerControls";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const post = await db.collaborationPost.findUnique({ where: { id: postId }, select: { title: true } });
  return { title: post ? `${post.title} — DIMENSION Collabs` : "Collaboration not found" };
}

export default async function CollabDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();

  const postRecord = await db.collaborationPost.findUnique({ where: { id: postId }, include: collabPostInclude });
  if (!postRecord) notFound();
  if (postRecord.status === "draft" && postRecord.creatorId !== session?.user?.id) notFound();

  const post = serializeCollabPost(postRecord);
  const isOwner = session?.user?.id === post.creator.id;
  const canApply = !isOwner && post.status === "open" && !!session?.user?.id;

  let budget = "Free / Collaboration";
  if (post.isPaid) {
    if (post.budgetMinCents != null && post.budgetMaxCents != null) {
      budget = `${formatPrice(post.budgetMinCents)} – ${formatPrice(post.budgetMaxCents)}`;
    } else if (post.budgetMinCents != null) {
      budget = `From ${formatPrice(post.budgetMinCents)}`;
    } else if (post.budgetMaxCents != null) {
      budget = `Up to ${formatPrice(post.budgetMaxCents)}`;
    } else {
      budget = "Paid";
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Looking for {post.lookingFor}
        </span>
        <CollabStatusBadge status={post.status} />
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{post.title}</h1>

      <Link
        href={`/creators/${post.creator.id}`}
        className="mt-3 flex items-center gap-2.5 text-sm text-muted transition hover:text-accent"
      >
        <div className="relative h-8 w-8 overflow-hidden rounded-full bg-accent">
          {post.creator.profileImageUrl ? (
            <Image src={post.creator.profileImageUrl} alt="" fill sizes="32px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-accent-foreground">
              {initials(post.creator.producerName)}
            </div>
          )}
        </div>
        <span className="font-medium text-foreground">{post.creator.producerName}</span>
        {post.creator.ratingCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-2">
            <Star size={11} className="fill-current text-accent" />
            {post.creator.ratingAvg?.toFixed(1)} ({post.creator.ratingCount})
          </span>
        )}
      </Link>

      <div className="mt-5 flex flex-wrap gap-2">
        <Stat label="Genre" value={post.genre} />
        {post.subgenre && <Stat label="Subgenre" value={post.subgenre} />}
        {post.mood && <Stat label="Style" value={post.mood} />}
        <Stat label="Budget" value={budget} />
        <Stat
          label="Location"
          value={post.locationType === "remote" ? "Remote" : post.locationType === "in_person" ? "In Person" : "Remote / In Person"}
          icon={post.location ? <MapPin size={11} /> : undefined}
        />
        {post.deadline && (
          <Stat label="Deadline" value={new Date(post.deadline).toLocaleDateString()} icon={<Clock size={11} />} />
        )}
      </div>

      {post.skillsNeeded.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.skillsNeeded.map((skill) => (
            <span key={skill} className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted">
              #{skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 border-t border-border pt-6">
        {isOwner ? (
          <PostOwnerControls postId={post.id} status={post.status} applicationCount={post.applicationCount} />
        ) : canApply ? (
          <ApplyButton postId={post.id} />
        ) : !session?.user?.id ? (
          <Link
            href={`/login?callbackUrl=/collabs/${post.id}`}
            className="glow-accent inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
          >
            Log in to apply
          </Link>
        ) : (
          <p className="text-sm text-muted-2">This collaboration isn't accepting applications right now.</p>
        )}
      </div>

      {post.description && (
        <div className="mt-8 border-t border-border pt-8">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Description</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{post.description}</p>
        </div>
      )}

      {post.files.length > 0 && (
        <div className="mt-8 border-t border-border pt-8">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Attachments</h2>
          <CollabFileList files={post.files} />
        </div>
      )}

      <p className="mt-8 text-xs text-muted-2">Posted {formatRelativeDate(post.createdAt)}</p>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5">
      {icon}
      <span className="text-sm font-medium text-foreground">{value}</span>
      <span className="text-xs text-muted-2">{label}</span>
    </div>
  );
}
