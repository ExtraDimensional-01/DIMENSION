import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { invitationSchema } from "@/lib/collab-validations";
import { serializeInvitation } from "@/lib/collab-serialize";
import { createNotification } from "@/lib/notify";

const invitationInclude = {
  post: { select: { id: true, title: true } },
  inviter: { select: { id: true, producerName: true, profileImage: true } },
  invitee: { select: { id: true, producerName: true, profileImage: true } },
} as const;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction"); // "sent" | "received"

  const where =
    direction === "sent"
      ? { inviterId: session.user.id }
      : direction === "received"
        ? { inviteeId: session.user.id }
        : { OR: [{ inviterId: session.user.id }, { inviteeId: session.user.id }] };

  const invitations = await db.collaborationInvitation.findMany({
    where,
    include: invitationInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invitations: invitations.map(serializeInvitation) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = invitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (parsed.data.inviteeId === session.user.id) {
    return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });
  }

  const post = await db.collaborationPost.findUnique({ where: { id: parsed.data.postId } });
  if (!post) {
    return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
  }
  if (post.creatorId !== session.user.id) {
    return NextResponse.json({ error: "You can only invite people to your own collaborations" }, { status: 403 });
  }
  if (post.status !== "open" && post.status !== "draft") {
    return NextResponse.json({ error: "This collaboration is no longer open for invitations" }, { status: 400 });
  }

  const invitee = await db.user.findUnique({ where: { id: parsed.data.inviteeId }, select: { id: true } });
  if (!invitee) {
    return NextResponse.json({ error: "That user doesn't exist" }, { status: 404 });
  }

  const existingPending = await db.collaborationInvitation.findFirst({
    where: { postId: post.id, inviteeId: parsed.data.inviteeId, status: "pending" },
  });
  if (existingPending) {
    return NextResponse.json({ error: "You've already invited this person to this collaboration" }, { status: 400 });
  }

  // Publish a draft post automatically when it's used as an invite target.
  if (post.status === "draft") {
    await db.collaborationPost.update({ where: { id: post.id }, data: { status: "open" } });
  }

  const invitation = await db.collaborationInvitation.create({
    data: {
      postId: post.id,
      inviterId: session.user.id,
      inviteeId: parsed.data.inviteeId,
      roleNeeded: parsed.data.roleNeeded,
      message: parsed.data.message,
    },
    include: invitationInclude,
  });

  await createNotification(
    parsed.data.inviteeId,
    "invitation_new",
    "Collaboration invitation",
    `You've been invited to collaborate on "${post.title}".`,
    `/collabs/${post.id}`
  );

  return NextResponse.json({ invitation: serializeInvitation(invitation) }, { status: 201 });
}
