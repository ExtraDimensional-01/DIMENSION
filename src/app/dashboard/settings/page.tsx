import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { SocialLinksManager } from "@/components/dashboard/SocialLinksManager";
import { DeleteAccountSection } from "@/components/dashboard/DeleteAccountSection";
import { CreatorProfileForm } from "@/components/collabs/CreatorProfileForm";
import { serializeCreatorProfile } from "@/lib/collab-serialize";
import { creatorProfileInclude } from "@/lib/creator-query";
import type { SocialPlatform } from "@/lib/constants";

export const metadata: Metadata = { title: "Settings — DIMENSION" };

export default async function SettingsPage() {
  const session = await auth();
  const [user, creatorProfile, socialLinks] = await Promise.all([
    db.user.findUnique({
      where: { id: session!.user.id },
      select: { producerName: true, bio: true, profileImage: true, bannerImage: true },
    }),
    db.creatorProfile.findUnique({ where: { userId: session!.user.id }, include: creatorProfileInclude }),
    db.socialLink.findMany({ where: { userId: session!.user.id }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Profile settings</h1>
      <p className="mt-1.5 mb-8 text-sm text-muted">
        This information is shown on your public producer profile.
      </p>
      <ProfileForm
        initialProducerName={user!.producerName}
        initialBio={user!.bio}
        initialImageUrl={fileUrl(user!.profileImage)}
        initialBannerUrl={fileUrl(user!.bannerImage)}
      />

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="text-xl font-semibold tracking-tight">Social links</h2>
        <p className="mt-1.5 mb-6 text-sm text-muted">
          Shown on your public profile so listeners can find you elsewhere.
        </p>
        <SocialLinksManager
          initialLinks={socialLinks.map((l) => ({
            platform: l.platform as SocialPlatform,
            url: l.url,
            displayName: l.displayName,
          }))}
        />
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="text-xl font-semibold tracking-tight">Creator profile</h2>
        <p className="mt-1.5 mb-6 text-sm text-muted">
          Powers your Collabs presence — the roles, genres, and skills other creators use to find you.
        </p>
        <CreatorProfileForm initial={creatorProfile ? serializeCreatorProfile(creatorProfile) : null} />
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <DeleteAccountSection />
      </div>
    </div>
  );
}
