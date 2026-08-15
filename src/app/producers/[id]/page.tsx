import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Music2, UploadCloud } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { beatInclude } from "@/lib/beat-query";
import { serializeBeatSummary } from "@/lib/serialize";
import { getUnlockedBeatIds } from "@/lib/orders";
import { fileUrl } from "@/lib/storage";
import { formatMonthYear, initials } from "@/lib/utils";
import type { SocialPlatform } from "@/lib/constants";
import { BeatGrid } from "@/components/beats/BeatGrid";
import { BeatCard } from "@/components/beats/BeatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProducerBanner } from "@/components/producers/ProducerBanner";
import { ProducerStatsAndActions } from "@/components/producers/ProducerStatsAndActions";
import { SocialLinksDisplay } from "@/components/producers/SocialLinksDisplay";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const producer = await db.user.findUnique({ where: { id }, select: { producerName: true } });
  return { title: producer ? `${producer.producerName} — DIMENSION` : "Producer not found" };
}

export default async function ProducerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [producer, session] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        producerName: true,
        bio: true,
        profileImage: true,
        bannerImage: true,
        createdAt: true,
        role: true,
        deletedAt: true,
        socialLinks: { orderBy: { sortOrder: "asc" } },
        _count: { select: { followers: true, following: true } },
      },
    }),
    auth(),
  ]);
  if (!producer || producer.deletedAt) notFound();

  const isOwnProfile = session?.user?.id === id;
  const viewerId = session?.user?.id;

  const [beatsRaw, isFollowingRow, salesCount] = await Promise.all([
    db.beat.findMany({
      where: { producerId: id, ...(isOwnProfile ? {} : { isPublic: true }) },
      include: beatInclude,
      orderBy: { createdAt: "desc" },
    }),
    viewerId && viewerId !== id
      ? db.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: id } }, select: { id: true } })
      : Promise.resolve(null),
    db.order.count({ where: { sellerId: id, status: "confirmed" } }),
  ]);

  const unlockedIds = await getUnlockedBeatIds(viewerId, beatsRaw.map((b) => b.id));
  const beats = beatsRaw.map((beat) => serializeBeatSummary(beat, unlockedIds.has(beat.id)));

  // Real, derived from the producer's own beats — never fabricated.
  const genreCounts = new Map<string, number>();
  for (const b of beatsRaw) genreCounts.set(b.genre, (genreCounts.get(b.genre) ?? 0) + 1);
  const genreTags = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);

  const canMessage = !!session?.user && !isOwnProfile && producer.role === "producer";
  const bannerUrl = fileUrl(producer.bannerImage);
  const avatarUrl = fileUrl(producer.profileImage);
  const socialLinks = producer.socialLinks.map((s) => ({
    platform: s.platform as SocialPlatform,
    url: s.url,
    displayName: s.displayName,
  }));

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12 sm:px-6">
      <ProducerBanner bannerUrl={bannerUrl} isOwner={isOwnProfile} />

      <div className="relative z-10 -mt-14 flex flex-col gap-5 px-1 sm:-mt-16 sm:flex-row sm:items-end sm:px-2">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-background bg-accent shadow-[0_8px_28px_-10px_rgba(0,0,0,0.7)] ring-1 ring-accent/40 sm:h-36 sm:w-36">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={producer.producerName} fill sizes="144px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-accent-foreground sm:text-4xl">
              {initials(producer.producerName)}
            </div>
          )}
        </div>

        <div className="flex-1 pb-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {producer.producerName}
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-2">
            {producer.role} · Joined {formatMonthYear(producer.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-5 max-w-2xl">
        {producer.bio && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{producer.bio}</p>
        )}
        {genreTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {genreTags.map((g) => (
              <span
                key={g}
                className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <ProducerStatsAndActions
          producerId={producer.id}
          producerName={producer.producerName}
          beatCount={beats.length}
          initialFollowerCount={producer._count.followers}
          followingCount={producer._count.following}
          salesCount={salesCount}
          initialIsFollowing={!!isFollowingRow}
          isOwner={isOwnProfile}
          canMessage={canMessage}
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="cut-corner order-2 flex h-fit flex-col gap-6 border border-border bg-surface p-5 lg:order-1">
          {producer.bio && (
            <div>
              <h2 className="kicker">About</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{producer.bio}</p>
            </div>
          )}
          {genreTags.length > 0 && (
            <div>
              <h2 className="kicker">Genres</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {genreTags.map((g) => (
                  <span key={g} className="rounded-full bg-surface-hover px-2.5 py-1 text-[11px] text-muted">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
          {socialLinks.length > 0 && (
            <div>
              <h2 className="kicker">Socials</h2>
              <div className="mt-3">
                <SocialLinksDisplay links={socialLinks} />
              </div>
            </div>
          )}
          <div>
            <h2 className="kicker">Details</h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-muted-2">Member since</dt>
                <dd className="font-medium text-foreground">{formatMonthYear(producer.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <section className="order-1 lg:order-2">
          <div className="mb-5 flex items-center gap-2.5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">Beats</h2>
            <span className="text-sm text-muted-2">
              {beats.length} result{beats.length === 1 ? "" : "s"}
            </span>
          </div>

          {beats.length === 0 ? (
            <EmptyState
              icon={Music2}
              title="No beats yet"
              description="This dimension is still being constructed."
              action={
                isOwnProfile ? (
                  <Link
                    href="/dashboard/upload"
                    className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
                  >
                    <UploadCloud size={15} />
                    Upload your first beat
                  </Link>
                ) : undefined
              }
            />
          ) : beats.length === 1 ? (
            <div className="max-w-sm">
              <BeatCard beat={beats[0]} queue={beats} />
            </div>
          ) : (
            <BeatGrid beats={beats} />
          )}
        </section>
      </div>
    </div>
  );
}
