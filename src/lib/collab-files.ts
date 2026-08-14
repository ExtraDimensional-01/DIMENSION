import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { ALLOWED_PROJECT_FILE_TYPES, MAX_PROJECT_FILE_SIZE_BYTES } from "@/lib/constants";

interface ParentRefs {
  postId?: string | null;
  applicationId?: string | null;
  projectId?: string | null;
  messageId?: string | null;
}

/**
 * A CollaborationFile always belongs to exactly one of post/application/
 * project/message. SQLite has no usable cross-column CHECK in Prisma 6, so
 * this invariant is enforced here in the API layer instead.
 */
export function assertExactlyOneParent(parents: ParentRefs) {
  const setCount = [parents.postId, parents.applicationId, parents.projectId, parents.messageId].filter(
    Boolean
  ).length;
  if (setCount !== 1) {
    throw new Error("A file must belong to exactly one of post, application, project, or message.");
  }
}

/**
 * Fetches a CollaborationFile and checks whether `userId` (null for an
 * anonymous visitor) is authorized to view it:
 *  - project/message files -> must be a CollaborationParticipant of the project.
 *  - application files -> only the applicant or the post's creator.
 *  - post files -> public, unless the post is still a draft (creator-only then).
 * Returns the row (including fileKey, for streaming) if authorized, else null.
 */
export async function getAuthorizedCollabFile(fileId: string, userId: string | null) {
  const file = await db.collaborationFile.findUnique({
    where: { id: fileId },
    include: {
      post: { select: { creatorId: true, status: true } },
      application: { select: { applicantId: true, post: { select: { creatorId: true } } } },
      project: { select: { participants: { select: { userId: true } } } },
      message: { select: { project: { select: { participants: { select: { userId: true } } } } } },
    },
  });
  if (!file) return null;

  if (file.projectId && file.project) {
    const isParticipant = !!userId && file.project.participants.some((p) => p.userId === userId);
    return isParticipant ? file : null;
  }

  if (file.messageId && file.message) {
    const isParticipant = !!userId && file.message.project.participants.some((p) => p.userId === userId);
    return isParticipant ? file : null;
  }

  if (file.applicationId && file.application) {
    const isApplicant = !!userId && userId === file.application.applicantId;
    const isPostCreator = !!userId && userId === file.application.post.creatorId;
    return isApplicant || isPostCreator ? file : null;
  }

  if (file.postId && file.post) {
    if (file.post.status !== "draft") return file;
    const isCreator = !!userId && userId === file.post.creatorId;
    return isCreator ? file : null;
  }

  return null;
}

export function canDeleteCollabFile(userId: string, file: { uploaderId: string }): boolean {
  return userId === file.uploaderId;
}

interface SaveCollabFileParams extends ParentRefs {
  file: File;
  uploaderId: string;
}

/** Validates, stores on disk, and persists a CollaborationFile row for an uploaded file. */
export async function saveCollabFile({
  file,
  uploaderId,
  postId,
  applicationId,
  projectId,
  messageId,
}: SaveCollabFileParams) {
  assertExactlyOneParent({ postId, applicationId, projectId, messageId });

  let ext = ALLOWED_PROJECT_FILE_TYPES[file.type];
  if (!ext) {
    // MIDI/ZIP MIME types are reported inconsistently across browsers/OSes —
    // fall back to the file's own extension if it's on the allow-list.
    const fallback = file.name.split(".").pop()?.toLowerCase();
    const validExts = new Set(Object.values(ALLOWED_PROJECT_FILE_TYPES));
    if (fallback && validExts.has(fallback)) ext = fallback;
  }
  if (!ext) {
    throw new Error("Unsupported file type");
  }
  if (file.size > MAX_PROJECT_FILE_SIZE_BYTES) {
    throw new Error(`File must be under ${Math.round(MAX_PROJECT_FILE_SIZE_BYTES / 1024 / 1024)}MB`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await storage.save(buffer, "collab", ext);

  return db.collaborationFile.create({
    data: {
      fileKey: key,
      fileName: file.name,
      fileType: ext,
      fileSize: file.size,
      uploaderId,
      postId: postId ?? undefined,
      applicationId: applicationId ?? undefined,
      projectId: projectId ?? undefined,
      messageId: messageId ?? undefined,
    },
  });
}
