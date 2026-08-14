import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { initials } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Producers — DIMENSION" };

export default async function ProducersPage() {
  const producers = await db.user.findMany({
    where: { beats: { some: { isPublic: true } } },
    select: {
      id: true,
      producerName: true,
      bio: true,
      profileImage: true,
      _count: { select: { beats: { where: { isPublic: true } } } },
    },
    orderBy: { beats: { _count: "desc" } },
  });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <span className="kicker mb-3">The roster</span>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-4xl">
          Producers
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          Every producer building their catalog on DIMENSION.
        </p>
      </div>

      {producers.length === 0 ? (
        <EmptyState icon={Users} title="No producers yet" description="Be the first to upload a beat." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {producers.map((p) => (
            <Link
              key={p.id}
              href={`/producers/${p.id}`}
              className="corner-frame flex flex-col items-center rounded-xl border border-transparent bg-surface p-5 text-center transition hover:border-accent/40 hover:bg-surface-hover"
            >
              <div className="relative mb-3 h-16 w-16 overflow-hidden rounded-full bg-accent">
                {p.profileImage ? (
                  <Image
                    src={fileUrl(p.profileImage)!}
                    alt={p.producerName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-base font-semibold text-accent-foreground">
                    {initials(p.producerName)}
                  </div>
                )}
              </div>
              <p className="truncate text-sm font-semibold text-foreground">{p.producerName}</p>
              <p className="mt-1 text-xs text-muted-2">
                {p._count.beats} beat{p._count.beats === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
