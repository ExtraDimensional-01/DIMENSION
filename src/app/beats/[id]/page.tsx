import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EyeOff, Music2, Pencil, Play as PlayIcon } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { beatInclude } from "@/lib/beat-query";
import { serializeBeat } from "@/lib/serialize";
import { isBeatUnlockedForUser } from "@/lib/orders";
import { formatRelativeDate, formatPrice, formatFileSize } from "@/lib/utils";
import { BeatDetailPlayButton } from "@/components/beats/BeatDetailPlayButton";
import { DeleteBeatButton } from "@/components/beats/DeleteBeatButton";
import { BuyButton } from "@/components/beats/BuyButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const beat = await db.beat.findUnique({ where: { id }, select: { title: true } });
  return { title: beat ? `${beat.title} — DIMENSION` : "Beat not found" };
}

export default async function BeatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [beatRecord, session] = await Promise.all([
    db.beat.findUnique({ where: { id }, include: beatInclude }),
    auth(),
  ]);

  if (!beatRecord) notFound();

  const unlocked = await isBeatUnlockedForUser(session?.user?.id, id);
  const beat = serializeBeat(beatRecord, unlocked);
  const isOwner = session?.user?.id === beat.producer.id;
  const canBuy = !isOwner && !beat.exclusiveSoldAt && session?.user?.id != null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-surface sm:w-72">
          {beat.coverUrl ? (
            <Image
              src={beat.coverUrl}
              alt={beat.title}
              fill
              sizes="(max-width: 640px) 100vw, 288px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-2">
              <Music2 size={48} />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-2">
                {beat.genre}
              </p>
              {!beat.isPublic && (
                <span className="flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                  <EyeOff size={10} />
                  Unlisted
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {beat.title}
              </h1>
              {beat.startingPriceCents != null && (
                <span className="glow-accent rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
                  {beat.exclusiveSoldAt ? "Sold" : `From ${formatPrice(beat.startingPriceCents)}`}
                </span>
              )}
            </div>
            <Link
              href={`/producers/${beat.producer.id}`}
              className="mt-2 inline-block text-sm font-medium text-muted transition hover:text-accent"
            >
              by {beat.producer.producerName}
            </Link>

            <div className="mt-5 flex flex-wrap gap-2">
              <Stat label="BPM" value={String(beat.bpm)} />
              <Stat label="Key" value={beat.key} />
              <Stat label="Plays" value={beat.playCount.toLocaleString()} icon={<PlayIcon size={11} />} />
              <Stat label="Uploaded" value={formatRelativeDate(beat.createdAt)} />
            </div>

            {beat.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {beat.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/?tag=${encodeURIComponent(t)}`}
                    className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted transition hover:bg-surface-hover hover:text-foreground"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BeatDetailPlayButton beat={beat} />

            {isOwner && (
              <>
                <Link
                  href={`/dashboard/beats/${beat.id}/edit`}
                  className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-muted-2"
                >
                  <Pencil size={14} />
                  Edit
                </Link>
                <DeleteBeatButton beatId={beat.id} redirectTo="/dashboard" />
              </>
            )}
          </div>
        </div>
      </div>

      {beat.licenses.length > 0 && (
        <div className="mt-10 max-w-3xl border-t border-border pt-8">
          <h2 className="mb-4 text-sm font-semibold text-foreground">License options</h2>
          {beat.exclusiveSoldAt && (
            <p className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
              Exclusive rights to this beat have been sold — it&apos;s no longer available for purchase.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {beat.licenses.map((license) => (
              <div
                key={license.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{license.name}</p>
                    {license.isExclusive && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        Exclusive
                      </span>
                    )}
                  </div>
                  {license.terms && (
                    <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted">{license.terms}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-muted-2">
                    {license.fileFormat.toUpperCase()} · {formatFileSize(license.fileSize)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-accent">{formatPrice(license.priceCents)}</span>
                  {canBuy && <BuyButton license={license} producerId={beat.producer.id} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {beat.description && (
        <div className="mt-10 max-w-3xl border-t border-border pt-8">
          <h2 className="mb-2 text-sm font-semibold text-foreground">About this beat</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
            {beat.description}
          </p>
        </div>
      )}
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
