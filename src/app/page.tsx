import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Music2, Radio, Users } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serializeBeatSummary } from "@/lib/serialize";
import { getUnlockedBeatIds } from "@/lib/orders";
import { beatInclude, buildBeatWhere, buildBeatOrderBy } from "@/lib/beat-query";
import { BEATS_PAGE_SIZE, BPM_RANGES } from "@/lib/constants";
import { formatCompactNumber } from "@/lib/utils";
import { BrowseBeats } from "@/components/beats/BrowseBeats";
import { TrendingList } from "@/components/beats/TrendingList";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const bpmRangeLabel = sp.bpm?.trim() ?? "";
  const bpmRange = BPM_RANGES.find((r) => r.label === bpmRangeLabel);

  const filters = {
    q: sp.q?.trim() ?? "",
    genre: sp.genre?.trim() ?? "",
    mood: sp.mood?.trim() ?? "",
    key: sp.key?.trim() ?? "",
    bpmRange: bpmRangeLabel,
    tag: sp.tag?.trim() ?? "",
    sort: sp.sort ?? "newest",
  };

  const where = buildBeatWhere({ ...filters, bpmMin: bpmRange?.min, bpmMax: bpmRange?.max });
  const orderBy = buildBeatOrderBy(filters.sort);

  const [session, beats, total, trendingRaw, beatCount, producerCount, userCount] = await Promise.all([
    auth(),
    db.beat.findMany({ where, include: beatInclude, orderBy, take: BEATS_PAGE_SIZE }),
    db.beat.count({ where }),
    db.beat.findMany({
      where: { isPublic: true, playCount: { gt: 0 } },
      include: beatInclude,
      orderBy: { playCount: "desc" },
      take: 5,
    }),
    db.beat.count({ where: { isPublic: true } }),
    db.user.count({ where: { role: "producer" } }),
    db.user.count(),
  ]);

  const unlockedIds = await getUnlockedBeatIds(
    session?.user?.id,
    [...beats, ...trendingRaw].map((b) => b.id)
  );

  const trending = trendingRaw.map((beat) => serializeBeatSummary(beat, unlockedIds.has(beat.id)));

  const stats = [
    { icon: Music2, value: formatCompactNumber(beatCount), label: "Beats" },
    { icon: Radio, value: formatCompactNumber(producerCount), label: "Producers" },
    { icon: Users, value: formatCompactNumber(userCount), label: "Members" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Hero — clean and restrained: plain dark background, a small
          contained portal-emblem image, simple bold headline. No full-bleed
          artwork, no crack overlays, no scattered decorative glyphs. */}
      <section className="relative mb-14">
        {/* Full artwork, faded and blended into the dark background so it reads as ambience, not a pasted image */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <Image
            src="/brand/logo.png"
            alt=""
            fill
            sizes="1600px"
            className="object-cover opacity-[0.16] mix-blend-screen"
            style={{ objectPosition: "50% 38%" }}
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 55% at 50% 45%, transparent 0%, var(--background) 72%), linear-gradient(180deg, var(--background) 0%, transparent 18%, transparent 78%, var(--background) 100%)",
            }}
          />
        </div>

        {/* Small circular portal emblem, floating between the copy and the trending list */}
        <div
          className="pointer-events-none absolute right-[26%] top-1/2 hidden h-72 w-72 -translate-y-1/2 overflow-hidden rounded-full opacity-90 lg:block"
          style={{ boxShadow: "0 0 80px 10px var(--accent-glow)" }}
        >
          <Image
            src="/brand/logo-mark.png"
            alt=""
            fill
            sizes="288px"
            className="object-cover"
            priority
          />
        </div>

        <div className="relative grid grid-cols-1 gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_380px] lg:items-center lg:gap-10 lg:py-24">
          <div>
            <span className="kicker mb-5">Instrumentals · Unbound</span>
            <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.5rem]">
              <span className="block text-foreground">Discover.</span>
              <span className="block text-foreground">Connect.</span>
              <span className="glow-text block text-accent">Create.</span>
            </h1>
            <p className="mt-5 max-w-sm text-sm text-muted sm:text-base">
              Built for producers. Made for discovery. An endless catalog of instrumentals.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#browse"
                className="cut-corner-sm glow-accent bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-accent-foreground transition hover:bg-accent-hover"
              >
                Browse Beats
              </a>
              <Link
                href="/signup"
                className="flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:text-accent"
              >
                Join now
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mt-11 flex flex-wrap items-center gap-x-6 gap-y-4 sm:gap-x-8">
              {stats.map((s, i) => (
                <div key={s.label} className="flex items-center gap-6">
                  {i > 0 && <span className="hidden h-8 w-px bg-border sm:block" />}
                  <div className="flex items-center gap-2">
                    <s.icon size={15} className="text-accent" />
                    <div>
                      <p className="font-display text-lg font-bold leading-none text-foreground">
                        {s.value}
                        <span className="text-accent">+</span>
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-2">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <TrendingList beats={trending} />
        </div>
      </section>

      <div id="browse" className="mb-6 scroll-mt-20">
        <span className="kicker mb-2">Catalog</span>
        <h2 className="font-display text-xl font-bold uppercase tracking-tight sm:text-2xl">
          Browse beats
        </h2>
      </div>

      <BrowseBeats
        initialBeats={beats.map((beat) => serializeBeatSummary(beat, unlockedIds.has(beat.id)))}
        initialTotal={total}
        initialFilters={filters}
      />
    </div>
  );
}
