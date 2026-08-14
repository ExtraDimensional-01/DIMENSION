import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Star } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { creatorProfileInclude } from "@/lib/creator-query";
import { serializeCreatorProfile, serializeProject, serializeReview } from "@/lib/collab-serialize";
import { formatRelativeDate, initials } from "@/lib/utils";
import { InviteButton } from "@/components/collabs/InviteButton";
import { ReviewsList } from "@/components/collabs/ReviewsList";

const AVAILABILITY_LABELS: Record<string, string> = {
  open: "Open to Work",
  busy: "Busy",
  not_available: "Not Available",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const user = await db.user.findUnique({ where: { id: userId }, select: { producerName: true } });
  return { title: user ? `${user.producerName} — DIMENSION Collabs` : "Creator not found" };
}

export default async function CreatorProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const session = await auth();

  const profileRecord = await db.creatorProfile.findUnique({ where: { userId }, include: creatorProfileInclude });
  if (!profileRecord) notFound();

  const [showcasedProjects, reviews] = await Promise.all([
    db.collaborationProject.findMany({
      where: { status: "completed", participants: { some: { userId, showcaseOnProfile: true } } },
      include: {
        post: { select: { id: true, title: true, genre: true } },
        participants: { include: { user: { select: { id: true, producerName: true, profileImage: true } } } },
      },
      orderBy: { completedAt: "desc" },
      take: 12,
    }),
    db.collaborationReview.findMany({
      where: { revieweeId: userId },
      include: { reviewer: { select: { id: true, producerName: true, profileImage: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const profile = serializeCreatorProfile(profileRecord);
  const isOwnProfile = session?.user?.id === userId;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-accent">
          {profile.profileImageUrl ? (
            <Image src={profile.profileImageUrl} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-accent-foreground">
              {initials(profile.producerName)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {profile.producerName}
            </h1>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                profile.availability === "open" ? "bg-success/15 text-success" : "bg-surface-hover text-muted-2"
              }`}
            >
              {AVAILABILITY_LABELS[profile.availability] ?? profile.availability}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{profile.roles.join(" / ") || "Creator"}</p>
          {profile.headline && <p className="mt-2 text-sm text-foreground">{profile.headline}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-2">
            {profile.ratingCount > 0 && (
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-current text-accent" />
                {profile.ratingAvg?.toFixed(1)} ({profile.ratingCount} reviews)
              </span>
            )}
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {profile.location}
              </span>
            )}
            <span>Member since {formatRelativeDate(profile.memberSince)}</span>
          </div>

          {!isOwnProfile && session?.user?.id && (
            <div className="mt-5">
              <InviteButton userId={userId} />
            </div>
          )}
        </div>
      </div>

      {profile.bio && (
        <div className="mt-8 border-t border-border pt-6">
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{profile.bio}</p>
        </div>
      )}

      {(profile.genres.length > 0 || profile.skills.length > 0) && (
        <div className="mt-6 flex flex-col gap-3">
          {profile.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.genres.map((g) => (
                <span key={g} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">
                  {g}
                </span>
              ))}
            </div>
          )}
          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <span key={s} className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted">
                  #{s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {profile.portfolioLinks.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {profile.portfolioLinks.map((link) => (
            <a
              key={link}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:text-accent-hover"
            >
              {link}
            </a>
          ))}
        </div>
      )}

      {showcasedProjects.length > 0 && (
        <div className="mt-10 border-t border-border pt-8">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Completed Collaborations</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {showcasedProjects.map((p) => {
              const project = serializeProject(p);
              return (
                <Link
                  key={project.id}
                  href={`/collabs/${project.post.id}`}
                  className="rounded-xl border border-border p-4 transition hover:border-accent/40 hover:bg-surface-hover"
                >
                  <p className="text-sm font-semibold text-foreground">{project.name}</p>
                  <p className="mt-1 text-xs text-muted-2">
                    {project.participants.map((p) => p.user.producerName).join(" · ")}
                  </p>
                  {project.completedAt && (
                    <p className="mt-1 text-[11px] text-muted-2">
                      Completed {new Date(project.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Reviews</h2>
        <ReviewsList reviews={reviews.map(serializeReview)} />
      </div>
    </div>
  );
}
