import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { profileUpdateSchema } from "@/lib/validations";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";
import { fileUrl } from "@/lib/storage";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await db.user.findUnique({ where: { id: session.user.id } });
  if (!currentUser) {
    return NextResponse.json(
      { error: "Your session is no longer valid. Please log out and log back in." },
      { status: 401 }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  let fields: Record<string, unknown> = {};
  let avatarFile: File | null = null;
  let bannerFile: File | null = null;
  let removeBanner = false;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    fields.producerName = formData.get("producerName");
    fields.bio = formData.get("bio") ?? "";
    const avatar = formData.get("avatar");
    if (avatar instanceof File && avatar.size > 0) avatarFile = avatar;
    const banner = formData.get("banner");
    if (banner instanceof File && banner.size > 0) bannerFile = banner;
    removeBanner = formData.get("removeBanner") === "true";
  } else {
    fields = await req.json().catch(() => ({}));
  }

  const parsed = profileUpdateSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  let newAvatarKey: string | undefined;

  if (avatarFile) {
    const ext = ALLOWED_IMAGE_TYPES[avatarFile.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Profile picture must be a JPG, PNG, or WEBP image" },
        { status: 400 }
      );
    }
    if (avatarFile.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Profile picture must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    newAvatarKey = await storage.save(buffer, "avatars", ext);

    if (currentUser.profileImage) await storage.delete(currentUser.profileImage);
  }

  let newBannerKey: string | null | undefined;

  if (bannerFile) {
    const ext = ALLOWED_IMAGE_TYPES[bannerFile.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Banner must be a JPG, PNG, or WEBP image" },
        { status: 400 }
      );
    }
    if (bannerFile.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Banner must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await bannerFile.arrayBuffer());
    newBannerKey = await storage.save(buffer, "banners", ext);
    if (currentUser.bannerImage) await storage.delete(currentUser.bannerImage);
  } else if (removeBanner && currentUser.bannerImage) {
    await storage.delete(currentUser.bannerImage);
    newBannerKey = null;
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      producerName: parsed.data.producerName,
      bio: parsed.data.bio,
      ...(newAvatarKey ? { profileImage: newAvatarKey } : {}),
      ...(newBannerKey !== undefined ? { bannerImage: newBannerKey } : {}),
    },
    select: { id: true, producerName: true, bio: true, profileImage: true, bannerImage: true, email: true },
  });

  return NextResponse.json({
    user: { ...user, profileImageUrl: fileUrl(user.profileImage), bannerImageUrl: fileUrl(user.bannerImage) },
  });
}
