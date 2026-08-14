import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { applicationSchema } from "@/lib/collab-validations";
import { serializeApplication } from "@/lib/collab-serialize";
import { saveCollabFile } from "@/lib/collab-files";
import { createNotification } from "@/lib/notify";

const applicationInclude = {
  applicant: { select: { id: true, producerName: true, profileImage: true } },
  files: true,
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await db.collaborationPost.findUnique({ where: { id: postId }, select: { creatorId: true } });
  if (!post) {
    return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
  }
  if (post.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Only the creator can view applications" }, { status: 403 });
  }

  const applications = await db.collaborationApplication.findMany({
    where: { postId },
    include: applicationInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ applications: applications.map(serializeApplication) });
}

export async function POST(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be logged in to apply" }, { status: 401 });
  }

  const post = await db.collaborationPost.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
  }
  if (post.creatorId === session.user.id) {
    return NextResponse.json({ error: "You can't apply to your own collaboration" }, { status: 400 });
  }
  if (post.status !== "open") {
    return NextResponse.json({ error: "This collaboration isn't accepting applications right now" }, { status: 400 });
  }

  const existingPending = await db.collaborationApplication.findFirst({
    where: { postId, applicantId: session.user.id, status: "pending" },
    select: { id: true },
  });
  if (existingPending) {
    return NextResponse.json({ error: "You already have an application pending on this collaboration" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  let portfolioLinks: string[] = [];
  const linksRaw = formData.get("portfolioLinks");
  if (typeof linksRaw === "string" && linksRaw.length > 0) {
    try {
      portfolioLinks = JSON.parse(linksRaw);
    } catch {
      portfolioLinks = [];
    }
  }

  const priceRaw = formData.get("proposedPrice");
  let proposedPriceCents: number | null = null;
  if (typeof priceRaw === "string" && priceRaw.trim() !== "") {
    const dollars = Number(priceRaw);
    if (Number.isNaN(dollars) || dollars < 0) {
      return NextResponse.json({ error: "Enter a valid proposed price" }, { status: 400 });
    }
    proposedPriceCents = Math.round(dollars * 100);
  }

  const parsed = applicationSchema.safeParse({
    message: formData.get("message"),
    proposedPriceCents,
    portfolioLinks,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const application = await db.collaborationApplication.create({
    data: {
      postId,
      applicantId: session.user.id,
      message: parsed.data.message,
      proposedPriceCents: parsed.data.proposedPriceCents ?? null,
      portfolioLinks: JSON.stringify(parsed.data.portfolioLinks),
    },
  });

  const attachments = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of attachments) {
    try {
      await saveCollabFile({ file, uploaderId: session.user.id, applicationId: application.id });
    } catch {
      // Skip files that fail validation rather than failing the whole application.
    }
  }

  await createNotification(
    post.creatorId,
    "application_new",
    "New application",
    `Someone applied to collaborate on "${post.title}".`,
    `/collabs/${postId}`
  );

  const full = await db.collaborationApplication.findUniqueOrThrow({
    where: { id: application.id },
    include: applicationInclude,
  });

  return NextResponse.json({ application: serializeApplication(full) }, { status: 201 });
}
