import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cancelProject } from "@/lib/collab-workflow";

export async function PATCH(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const project = await cancelProject(projectId, session.user.id);
    return NextResponse.json({ status: project.status });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to cancel" }, { status: 400 });
  }
}
