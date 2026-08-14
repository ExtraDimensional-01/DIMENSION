import { serveStoredObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: keyParts } = await params;
  const key = keyParts.join("/");

  // License deliverable files are private — they must only ever be reachable
  // through /api/orders/[id]/download, which checks the requester is the
  // order's buyer or seller. This route is for public assets only (audio
  // previews, cover art, avatars), so refuse anything under the local
  // "license/" prefix or the R2 "beats/{userId}/{beatId}/licenses/" prefix.
  if (keyParts[0] === "license" || key.includes("/licenses/")) {
    return new Response("Not found", { status: 404 });
  }

  return serveStoredObject(req, key, { disposition: "inline" });
}
