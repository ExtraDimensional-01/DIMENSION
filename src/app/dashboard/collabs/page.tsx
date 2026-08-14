import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { collabPostInclude } from "@/lib/collab-query";
import { serializeApplication, serializeCollabPostSummary, serializeInvitation } from "@/lib/collab-serialize";
import { DashboardCollabsTabs } from "@/components/collabs/DashboardCollabsTabs";

export const metadata: Metadata = { title: "Collabs — Dashboard — DIMENSION" };

const applicationInclude = {
  applicant: { select: { id: true, producerName: true, profileImage: true } },
  files: true,
  post: { select: { id: true, title: true, status: true } },
} as const;

const invitationInclude = {
  post: { select: { id: true, title: true } },
  inviter: { select: { id: true, producerName: true, profileImage: true } },
  invitee: { select: { id: true, producerName: true, profileImage: true } },
} as const;

export default async function DashboardCollabsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/collabs");
  const userId = session.user.id;

  const [postsRaw, applicationsReceivedRaw, myApplicationsRaw, invitationsReceivedRaw, invitationsSentRaw] =
    await Promise.all([
      db.collaborationPost.findMany({
        where: { creatorId: userId },
        include: collabPostInclude,
        orderBy: { createdAt: "desc" },
      }),
      db.collaborationApplication.findMany({
        where: { post: { creatorId: userId } },
        include: applicationInclude,
        orderBy: { createdAt: "desc" },
      }),
      db.collaborationApplication.findMany({
        where: { applicantId: userId },
        include: applicationInclude,
        orderBy: { createdAt: "desc" },
      }),
      db.collaborationInvitation.findMany({
        where: { inviteeId: userId },
        include: invitationInclude,
        orderBy: { createdAt: "desc" },
      }),
      db.collaborationInvitation.findMany({
        where: { inviterId: userId },
        include: invitationInclude,
        orderBy: { createdAt: "desc" },
      }),
    ]);

  return (
    <div>
      <div className="mb-6">
        <span className="kicker mb-2">Creator Network</span>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">Collabs</h1>
      </div>

      <DashboardCollabsTabs
        posts={postsRaw.map(serializeCollabPostSummary)}
        applicationsReceived={applicationsReceivedRaw.map((a) => ({ ...serializeApplication(a), post: a.post }))}
        myApplications={myApplicationsRaw.map((a) => ({ ...serializeApplication(a), post: a.post }))}
        invitationsReceived={invitationsReceivedRaw.map(serializeInvitation)}
        invitationsSent={invitationsSentRaw.map(serializeInvitation)}
      />
    </div>
  );
}
