import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MessageSquare, Music2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { beatInclude } from "@/lib/beat-query";
import { serializeBeatSummary } from "@/lib/serialize";
import { getUnlockedBeatIds } from "@/lib/orders";
import { fileUrl } from "@/lib/storage";
import { formatRelativeDate, initials } from "@/lib/utils";
import { BeatGrid } from "@/components/beats/BeatGrid";
import { EmptyState } from "@/components/ui/EmptyState";

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
      select: { id: true, producerName: true, bio: true, profileImage: true, createdAt: true, role: true },
    }),
    auth(),
  ]);
  if (!producer) notFound();

  const isOwnProfile = session?.user?.id === id;

  const beatsRaw = await db.beat.findMany({
    where: { producerId: id, ...(isOwnProfile ? {} : { isPublic: true }) },
    include: beatInclude,
    orderBy: { createdAt: "desc" },
  });
  const unlockedIds = await getUnlockedBeatIds(
    session?.user?.id,
    beatsRaw.map((b) => b.id)
  );
  const beats = beatsRaw.map((beat) => serializeBeatSummary(beat, unlockedIds.has(beat.id)));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-accent">
          {producer.profileImage ? (
            <Image
              src={fileUrl(producer.profileImage)!}
              alt={producer.producerName}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-accent-foreground">
              {initials(producer.producerName)}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {producer.producerName}
          </h1>
          <p className="mt-1 text-xs text-muted-2">
            Joined {formatRelativeDate(producer.createdAt)} · {beats.length} beat
            {beats.length === 1 ? "" : "s"}
          </p>
          {producer.bio && (
            <p className="mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed text-muted">
              {producer.bio}
            </p>
          )}
          {session?.user && !isOwnProfile && producer.role === "producer" && (
            <Link
              href={`/messages/${producer.id}`}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
            >
              <MessageSquare size={14} />
              Message
            </Link>
          )}
        </div>
      </div>

      {beats.length === 0 ? (
        <EmptyState icon={Music2} title="No beats uploaded yet" />
      ) : (
        <BeatGrid beats={beats} />
      )}
    </div>
  );
}
