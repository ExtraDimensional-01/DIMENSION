import type { Metadata } from "next";
import { db } from "@/lib/db";
import { serializeCreatorProfile } from "@/lib/collab-serialize";
import { creatorProfileInclude, buildCreatorWhere } from "@/lib/creator-query";
import { CREATORS_PAGE_SIZE } from "@/lib/constants";
import { BrowseCreators } from "@/components/collabs/BrowseCreators";
import type { CreatorFilters } from "@/components/collabs/CreatorSearchFilterBar";

export const metadata: Metadata = { title: "Find Creators — DIMENSION" };

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters: CreatorFilters = {
    q: sp.q?.trim() ?? "",
    role: sp.role?.trim() ?? "",
    genre: sp.genre?.trim() ?? "",
    skill: sp.skill?.trim() ?? "",
    location: sp.location?.trim() ?? "",
    availability: sp.availability?.trim() ?? "",
  };

  const where = buildCreatorWhere(filters);
  const [profiles, total] = await Promise.all([
    db.creatorProfile.findMany({
      where,
      include: creatorProfileInclude,
      orderBy: [{ ratingAvg: "desc" }, { updatedAt: "desc" }],
      take: CREATORS_PAGE_SIZE,
    }),
    db.creatorProfile.count({ where }),
  ]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <span className="kicker mb-2">Discover</span>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">Find Creators</h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Browse producers, artists, songwriters, vocalists, and engineers ready to collaborate.
        </p>
      </div>

      <BrowseCreators
        initialCreators={profiles.map(serializeCreatorProfile)}
        initialTotal={total}
        initialFilters={filters}
      />
    </div>
  );
}
