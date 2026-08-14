import { fileUrl } from "@/lib/storage";
import { fileTypeCategory } from "@/lib/constants";
import type {
  CollabApplication,
  CollabFile,
  CollabInvitation,
  CollabMessage,
  CollabParticipant,
  CollabPostDetail,
  CollabPostSummary,
  CollabProject,
  CollabReview,
  CollabTask,
  CreatorProfileSummary,
  NotificationItem,
} from "@/types";

/** Files are served through an authorized route by id — the raw storage key is never exposed. */
export function collabFileUrl(fileId: string): string {
  return `/api/collab-files/${fileId}`;
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type FileRow = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: Date;
  uploaderId: string;
};

export function serializeCollabFile(file: FileRow): CollabFile {
  return {
    id: file.id,
    fileName: file.fileName,
    fileType: file.fileType,
    category: fileTypeCategory(file.fileType),
    fileSize: file.fileSize,
    url: collabFileUrl(file.id),
    createdAt: file.createdAt.toISOString(),
    uploaderId: file.uploaderId,
  };
}

type CollabPostRow = {
  id: string;
  title: string;
  lookingFor: string;
  description: string;
  genre: string;
  subgenre: string;
  mood: string;
  skillsNeeded: string;
  isPaid: boolean;
  budgetMin: number | null;
  budgetMax: number | null;
  locationType: string;
  location: string;
  deadline: Date | null;
  status: string;
  contactPref: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  creator: {
    id: string;
    producerName: string;
    profileImage: string | null;
    creatorProfile: { ratingAvg: number | null; ratingCount: number } | null;
  };
  files: FileRow[];
  _count?: { applications: number };
};

export function serializeCollabPost(post: CollabPostRow): CollabPostDetail {
  return {
    id: post.id,
    title: post.title,
    lookingFor: post.lookingFor,
    description: post.description,
    genre: post.genre,
    subgenre: post.subgenre,
    mood: post.mood,
    skillsNeeded: parseJsonArray(post.skillsNeeded),
    isPaid: post.isPaid,
    budgetMinCents: post.budgetMin,
    budgetMaxCents: post.budgetMax,
    locationType: post.locationType,
    location: post.location,
    deadline: post.deadline ? post.deadline.toISOString() : null,
    status: post.status,
    contactPref: post.contactPref,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    applicationCount: post._count?.applications ?? 0,
    files: post.files.map(serializeCollabFile),
    creator: {
      id: post.creator.id,
      producerName: post.creator.producerName,
      profileImageUrl: fileUrl(post.creator.profileImage),
      ratingAvg: post.creator.creatorProfile?.ratingAvg ?? null,
      ratingCount: post.creator.creatorProfile?.ratingCount ?? 0,
    },
  };
}

export function serializeCollabPostSummary(post: CollabPostRow): CollabPostSummary {
  const { description: _description, files: _files, ...rest } = serializeCollabPost(post);
  return rest;
}

type ApplicationRow = {
  id: string;
  message: string;
  proposedPriceCents: number | null;
  portfolioLinks: string;
  status: string;
  createdAt: Date;
  postId: string;
  applicantId: string;
  applicant: { id: string; producerName: string; profileImage: string | null };
  files: FileRow[];
};

export function serializeApplication(app: ApplicationRow): CollabApplication {
  return {
    id: app.id,
    message: app.message,
    proposedPriceCents: app.proposedPriceCents,
    portfolioLinks: parseJsonArray(app.portfolioLinks),
    status: app.status,
    createdAt: app.createdAt.toISOString(),
    postId: app.postId,
    files: app.files.map(serializeCollabFile),
    applicant: {
      id: app.applicant.id,
      producerName: app.applicant.producerName,
      profileImageUrl: fileUrl(app.applicant.profileImage),
    },
  };
}

type ParticipantRow = {
  id: string;
  role: string;
  joinedAt: Date;
  lastReadAt: Date | null;
  showcaseOnProfile: boolean;
  userId: string;
  user: { id: string; producerName: string; profileImage: string | null };
};

export function serializeParticipant(p: ParticipantRow): CollabParticipant {
  return {
    id: p.id,
    role: p.role,
    joinedAt: p.joinedAt.toISOString(),
    lastReadAt: p.lastReadAt ? p.lastReadAt.toISOString() : null,
    showcaseOnProfile: p.showcaseOnProfile,
    user: {
      id: p.user.id,
      producerName: p.user.producerName,
      profileImageUrl: fileUrl(p.user.profileImage),
    },
  };
}

type ProjectRow = {
  id: string;
  name: string;
  description: string;
  status: string;
  coverKey: string | null;
  releaseUrl: string | null;
  completedAt: Date | null;
  createdAt: Date;
  postId: string;
  post: { id: string; title: string; genre: string };
  participants: ParticipantRow[];
};

export function serializeProject(project: ProjectRow): CollabProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    coverUrl: fileUrl(project.coverKey),
    releaseUrl: project.releaseUrl,
    completedAt: project.completedAt ? project.completedAt.toISOString() : null,
    createdAt: project.createdAt.toISOString(),
    post: project.post,
    participants: project.participants.map(serializeParticipant),
  };
}

type MessageRow = {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  sender: { id: string; producerName: string; profileImage: string | null };
  files: FileRow[];
};

export function serializeMessage(m: MessageRow): CollabMessage {
  return {
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    files: m.files.map(serializeCollabFile),
    sender: {
      id: m.sender.id,
      producerName: m.sender.producerName,
      profileImageUrl: fileUrl(m.sender.profileImage),
    },
  };
}

type TaskRow = {
  id: string;
  title: string;
  done: boolean;
  dueDate: Date | null;
  createdAt: Date;
  projectId: string;
  assigneeId: string | null;
  assignee: { id: string; producerName: string } | null;
};

export function serializeTask(t: TaskRow): CollabTask {
  return {
    id: t.id,
    title: t.title,
    done: t.done,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    projectId: t.projectId,
    assignee: t.assignee ? { id: t.assignee.id, producerName: t.assignee.producerName } : null,
  };
}

type ReviewRow = {
  id: string;
  communication: number;
  reliability: number;
  qualityOfWork: number;
  professionalism: number;
  overall: number;
  comment: string;
  createdAt: Date;
  projectId: string;
  reviewerId: string;
  reviewer: { id: string; producerName: string; profileImage: string | null };
  revieweeId: string;
};

export function serializeReview(r: ReviewRow): CollabReview {
  return {
    id: r.id,
    communication: r.communication,
    reliability: r.reliability,
    qualityOfWork: r.qualityOfWork,
    professionalism: r.professionalism,
    overall: r.overall,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    projectId: r.projectId,
    revieweeId: r.revieweeId,
    reviewer: {
      id: r.reviewer.id,
      producerName: r.reviewer.producerName,
      profileImageUrl: fileUrl(r.reviewer.profileImage),
    },
  };
}

type InvitationRow = {
  id: string;
  message: string;
  roleNeeded: string;
  status: string;
  createdAt: Date;
  postId: string;
  post: { id: string; title: string };
  inviterId: string;
  inviter: { id: string; producerName: string; profileImage: string | null };
  inviteeId: string;
  invitee: { id: string; producerName: string; profileImage: string | null };
};

export function serializeInvitation(inv: InvitationRow): CollabInvitation {
  return {
    id: inv.id,
    message: inv.message,
    roleNeeded: inv.roleNeeded,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
    post: inv.post,
    inviter: {
      id: inv.inviter.id,
      producerName: inv.inviter.producerName,
      profileImageUrl: fileUrl(inv.inviter.profileImage),
    },
    invitee: {
      id: inv.invitee.id,
      producerName: inv.invitee.producerName,
      profileImageUrl: fileUrl(inv.invitee.profileImage),
    },
  };
}

type CreatorProfileRow = {
  id: string;
  userId: string;
  roles: string;
  genres: string;
  skills: string;
  experience: string;
  location: string;
  remotePref: string;
  availability: string;
  headline: string;
  portfolioLinks: string;
  ratingAvg: number | null;
  ratingCount: number;
  user: { id: string; producerName: string; profileImage: string | null; bio: string; createdAt: Date };
};

export function serializeCreatorProfile(cp: CreatorProfileRow): CreatorProfileSummary {
  return {
    userId: cp.userId,
    producerName: cp.user.producerName,
    profileImageUrl: fileUrl(cp.user.profileImage),
    bio: cp.user.bio,
    roles: parseJsonArray(cp.roles),
    genres: parseJsonArray(cp.genres),
    skills: parseJsonArray(cp.skills),
    experience: cp.experience,
    location: cp.location,
    remotePref: cp.remotePref,
    availability: cp.availability,
    headline: cp.headline,
    portfolioLinks: parseJsonArray(cp.portfolioLinks),
    ratingAvg: cp.ratingAvg,
    ratingCount: cp.ratingCount,
    memberSince: cp.user.createdAt.toISOString(),
  };
}

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function serializeNotification(n: NotificationRow): NotificationItem {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: !!n.readAt,
    createdAt: n.createdAt.toISOString(),
  };
}
