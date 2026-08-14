import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serializeCollabPostSummary, serializeCreatorProfile } from "@/lib/collab-serialize";
import { collabPostInclude, buildCollabPostWhere, buildCollabPostOrderBy } from "@/lib/collab-query";
import { creatorProfileInclude } from "@/lib/creator-query";
import { COLLAB_POSTS_PAGE_SIZE } from "@/lib/constants";
import { BrowseCollabs } from "@/components/collabs/BrowseCollabs";
import { CollabSection } from "@/components/collabs/CollabSection";
import { CreatorCard } from "@/components/collabs/CreatorCard";
import type { CollabFilters } from "@/components/collabs/CollabSearchFilterBar";

export const metadata: Metadata = { title: "Collabs — DIMENSION" };

export default async function CollabsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const session = await auth();

  const filters: CollabFilters = {
    q: sp.q?.trim() ?? "",
    lookingFor: sp.lookingFor?.trim() ?? "",
    genre: sp.genre?.trim() ?? "",
    location: sp.location?.trim() ?? "",
    locationType: sp.locationType?.trim() ?? "",
    skill: sp.skill?.trim() ?? "",
    isPaid: sp.isPaid?.trim() ?? "",
    sort: sp.sort ?? "newest",
  };

  const where = buildCollabPostWhere({
    ...filters,
    isPaid: filters.isPaid === "true" ? true : filters.isPaid === "false" ? false : undefined,
  });
  const orderBy = buildCollabPostOrderBy(filters.sort);

  const [
    initialPosts,
    initialTotal,
    trendingRaw,
    recentRaw,
    openRaw,
    remoteRaw,
    producersRaw,
    artistsRaw,
    songwritersRaw,
    creatorsRaw,
  ] = await Promise.all([
    db.collaborationPost.findMany({ where, include: collabPostInclude, orderBy, take: COLLAB_POSTS_PAGE_SIZE }),
    db.collaborationPost.count({ where }),
    db.collaborationPost.findMany({
      where: { status: "open" },
      include: collabPostInclude,
      orderBy: { applications: { _count: "desc" } },
      take: 6,
    }),
    db.collaborationPost.findMany({
      where: { status: { not: "draft" } },
      include: collabPostInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.collaborationPost.findMany({
      where: { status: "open" },
      include: collabPostInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.collaborationPost.findMany({
      where: { status: "open", locationType: { in: ["remote", "both"] } },
      include: collabPostInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.collaborationPost.findMany({
      where: { status: "open", lookingFor: "Producer" },
      include: collabPostInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.collaborationPost.findMany({
      where: { status: "open", lookingFor: "Artist" },
      include: collabPostInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.collaborationPost.findMany({
      where: { status: "open", lookingFor: "Songwriter" },
      include: collabPostInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.creatorProfile.findMany({
      where: { ratingCount: { gt: 0 } },
      include: creatorProfileInclude,
      orderBy: { ratingAvg: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="kicker mb-3">Creator Network</span>
          <h1 className="font-display text-4xl font-bold uppercase leading-[1.05] tracking-tight sm:text-5xl">
            Collabs
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted sm:text-base">Find your next collaborator.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/creators"
            className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-muted-2"
          >
            Find Creators
          </Link>
          <Link
            href={session?.user ? "/collabs/create" : "/login?callbackUrl=/collabs/create"}
            className="glow-accent flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
          >
            <Plus size={16} />
            Create Collaboration
          </Link>
        </div>
      </div>

      <CollabSection title="Trending Collaborations" posts={trendingRaw.map(serializeCollabPostSummary)} />
      <CollabSection title="Recently Posted" posts={recentRaw.map(serializeCollabPostSummary)} />

      {creatorsRaw.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-tight text-foreground sm:text-base">
            Popular Creators
          </h2>
          <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {creatorsRaw.map((c) => (
              <div key={c.userId} className="w-64 shrink-0">
                <CreatorCard creator={serializeCreatorProfile(c)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <CollabSection title="Looking For Producers" posts={producersRaw.map(serializeCollabPostSummary)} />
      <CollabSection title="Looking For Artists" posts={artistsRaw.map(serializeCollabPostSummary)} />
      <CollabSection title="Looking For Songwriters" posts={songwritersRaw.map(serializeCollabPostSummary)} />
      <CollabSection title="Open Projects" posts={openRaw.map(serializeCollabPostSummary)} />
      <CollabSection title="Remote Collaborations" posts={remoteRaw.map(serializeCollabPostSummary)} />

      <div className="mb-6 border-t border-border pt-8">
        <span className="kicker mb-2">Browse</span>
        <h2 className="font-display text-xl font-bold uppercase tracking-tight sm:text-2xl">
          All collaborations
        </h2>
      </div>

      <BrowseCollabs
        initialPosts={initialPosts.map(serializeCollabPostSummary)}
        initialTotal={initialTotal}
        initialFilters={filters}
      />
    </div>
  );
}
