import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { collabPostSchema } from "@/lib/collab-validations";
import { serializeCollabPostSummary } from "@/lib/collab-serialize";
import { collabPostInclude, buildCollabPostWhere, buildCollabPostOrderBy } from "@/lib/collab-query";
import { saveCollabFile } from "@/lib/collab-files";
import { COLLAB_POSTS_PAGE_SIZE } from "@/lib/constants";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const lookingFor = searchParams.get("lookingFor")?.trim();
  const genre = searchParams.get("genre")?.trim();
  const location = searchParams.get("location")?.trim();
  const locationType = searchParams.get("locationType")?.trim();
  const skill = searchParams.get("skill")?.trim();
  const isPaidRaw = searchParams.get("isPaid");
  const isPaid = isPaidRaw === "true" ? true : isPaidRaw === "false" ? false : undefined;
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const mine = searchParams.get("mine") === "1";
  const statusParam = searchParams.get("status")?.trim();

  let creatorId: string | undefined;
  let includeDrafts = false;
  if (mine) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    creatorId = session.user.id;
    includeDrafts = true;
  }

  const where = buildCollabPostWhere({
    q,
    lookingFor,
    genre,
    location,
    locationType,
    skill,
    isPaid,
    sort,
    creatorId,
    includeDrafts,
    statusIn: statusParam ? [statusParam] : undefined,
  });
  const orderBy = buildCollabPostOrderBy(sort);

  const [posts, total] = await Promise.all([
    db.collaborationPost.findMany({
      where,
      include: collabPostInclude,
      orderBy,
      skip: (page - 1) * COLLAB_POSTS_PAGE_SIZE,
      take: COLLAB_POSTS_PAGE_SIZE,
    }),
    db.collaborationPost.count({ where }),
  ]);

  return NextResponse.json({
    posts: posts.map(serializeCollabPostSummary),
    total,
    page,
    hasMore: page * COLLAB_POSTS_PAGE_SIZE < total,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be logged in to post a collaboration" }, { status: 401 });
  }

  const currentUser = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!currentUser) {
    return NextResponse.json(
      { error: "Your session is no longer valid. Please log out and log back in." },
      { status: 401 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  let skillsNeeded: string[] = [];
  const skillsRaw = formData.get("skillsNeeded");
  if (typeof skillsRaw === "string" && skillsRaw.length > 0) {
    try {
      skillsNeeded = JSON.parse(skillsRaw);
    } catch {
      skillsNeeded = [];
    }
  }

  function dollarsToCents(raw: FormDataEntryValue | null): number | null {
    if (typeof raw !== "string" || raw.trim() === "") return null;
    const dollars = Number(raw);
    if (Number.isNaN(dollars) || dollars < 0) return null;
    return Math.round(dollars * 100);
  }

  const parsed = collabPostSchema.safeParse({
    title: formData.get("title"),
    lookingFor: formData.get("lookingFor"),
    description: formData.get("description") ?? "",
    genre: formData.get("genre"),
    subgenre: formData.get("subgenre") ?? "",
    mood: formData.get("mood") ?? "",
    skillsNeeded,
    isPaid: formData.get("isPaid") === "true",
    budgetMinCents: dollarsToCents(formData.get("budgetMin")),
    budgetMaxCents: dollarsToCents(formData.get("budgetMax")),
    locationType: formData.get("locationType") ?? "remote",
    location: formData.get("location") ?? "",
    deadline: formData.get("deadline") || null,
    contactPref: formData.get("contactPref") ?? "in_app",
    status: formData.get("status") === "open" ? "open" : "draft",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const post = await db.collaborationPost.create({
    data: {
      title: parsed.data.title,
      lookingFor: parsed.data.lookingFor,
      description: parsed.data.description,
      genre: parsed.data.genre,
      subgenre: parsed.data.subgenre,
      mood: parsed.data.mood,
      skillsNeeded: JSON.stringify(parsed.data.skillsNeeded),
      isPaid: parsed.data.isPaid,
      budgetMin: parsed.data.budgetMinCents,
      budgetMax: parsed.data.budgetMaxCents,
      locationType: parsed.data.locationType,
      location: parsed.data.location,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      contactPref: parsed.data.contactPref,
      status: parsed.data.status,
      creatorId: session.user.id,
    },
  });

  const attachments = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of attachments) {
    try {
      await saveCollabFile({ file, uploaderId: session.user.id, postId: post.id });
    } catch {
      // Skip files that fail validation rather than failing the whole post.
    }
  }

  const full = await db.collaborationPost.findUniqueOrThrow({
    where: { id: post.id },
    include: collabPostInclude,
  });

  return NextResponse.json({ post: serializeCollabPostSummary(full) }, { status: 201 });
}
