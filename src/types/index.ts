export interface BeatLicenseInfo {
  id: string;
  name: string;
  priceCents: number;
  terms: string;
  fileFormat: string;
  fileSize: number;
  isExclusive: boolean;
  /** Disabled tiers are hidden from buyers but still visible/manageable by the producer. */
  isActive: boolean;
  includedFormats: string[];
  commercialUse: boolean;
  distributionAllowed: boolean;
  musicVideoAllowed: boolean;
  performanceAllowed: boolean;
  socialMediaAllowed: boolean;
  /** null = unlimited */
  streamLimit: number | null;
  /** null = unlimited */
  salesLimit: number | null;
  creditRequired: boolean;
  creditText: string;
  otherRestrictions: string;
}

export interface BeatSummary {
  id: string;
  title: string;
  bpm: number;
  key: string;
  genre: string;
  mood: string | null;
  tags: string[];
  audioUrl: string;
  audioFormat: string;
  coverUrl: string | null;
  durationSec: number | null;
  waveformPeaks: number[] | null;
  playCount: number;
  isPublic: boolean;
  licenses: BeatLicenseInfo[];
  /** Lowest license price, or null if this beat has no license tiers (not for sale). */
  startingPriceCents: number | null;
  /** Set once an isExclusive license has been sold — no license can be purchased anymore. */
  exclusiveSoldAt: string | null;
  /** True if the current viewer has a confirmed Order for this beat — lifts the preview cap. */
  unlockedForViewer: boolean;
  createdAt: string;
  producer: {
    id: string;
    producerName: string;
    profileImageUrl: string | null;
  };
}

export interface BeatDetail extends BeatSummary {
  description: string;
}

export interface ProducerProfile {
  id: string;
  producerName: string;
  bio: string;
  profileImageUrl: string | null;
  createdAt: string;
  beats: BeatSummary[];
}

// =============================================================================
// Orders
// =============================================================================

export interface OrderInfo {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  priceCents: number;
  createdAt: string;
  confirmedAt: string | null;
  beatId: string;
  beatTitle: string;
  licenseId: string;
  licenseName: string;
  buyerId: string;
  sellerId: string;
}

/** An order plus buyer/seller/beat display info — used by the buyer orders page and producer sales dashboard. */
export interface OrderListItem extends OrderInfo {
  beatCoverUrl: string | null;
  buyer: { id: string; producerName: string; profileImageUrl: string | null };
  seller: { id: string; producerName: string; profileImageUrl: string | null };
}

// =============================================================================
// Collabs
// =============================================================================

export interface CollabFile {
  id: string;
  fileName: string;
  fileType: string;
  category: "wav" | "mp3" | "midi" | "zip" | "image" | "document" | "other";
  fileSize: number;
  url: string;
  createdAt: string;
  uploaderId: string;
}

export interface CollabPostSummary {
  id: string;
  title: string;
  lookingFor: string;
  genre: string;
  subgenre: string;
  mood: string;
  skillsNeeded: string[];
  isPaid: boolean;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  locationType: string;
  location: string;
  deadline: string | null;
  status: string;
  contactPref: string;
  createdAt: string;
  updatedAt: string;
  applicationCount: number;
  creator: {
    id: string;
    producerName: string;
    profileImageUrl: string | null;
    ratingAvg: number | null;
    ratingCount: number;
  };
}

export interface CollabPostDetail extends CollabPostSummary {
  description: string;
  files: CollabFile[];
}

export interface CollabApplication {
  id: string;
  message: string;
  proposedPriceCents: number | null;
  portfolioLinks: string[];
  status: string;
  createdAt: string;
  postId: string;
  files: CollabFile[];
  applicant: {
    id: string;
    producerName: string;
    profileImageUrl: string | null;
  };
}

export interface CollabParticipant {
  id: string;
  role: string;
  joinedAt: string;
  lastReadAt: string | null;
  showcaseOnProfile: boolean;
  user: {
    id: string;
    producerName: string;
    profileImageUrl: string | null;
  };
}

export interface CollabProject {
  id: string;
  name: string;
  description: string;
  status: string;
  coverUrl: string | null;
  releaseUrl: string | null;
  completedAt: string | null;
  createdAt: string;
  post: { id: string; title: string; genre: string };
  participants: CollabParticipant[];
}

export interface CollabMessage {
  id: string;
  body: string;
  createdAt: string;
  files: CollabFile[];
  sender: {
    id: string;
    producerName: string;
    profileImageUrl: string | null;
  };
}

export interface CollabTask {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  createdAt: string;
  projectId: string;
  assignee: { id: string; producerName: string } | null;
}

export interface CollabReview {
  id: string;
  communication: number;
  reliability: number;
  qualityOfWork: number;
  professionalism: number;
  overall: number;
  comment: string;
  createdAt: string;
  projectId: string;
  revieweeId: string;
  reviewer: {
    id: string;
    producerName: string;
    profileImageUrl: string | null;
  };
}

export interface CollabInvitation {
  id: string;
  message: string;
  roleNeeded: string;
  status: string;
  createdAt: string;
  post: { id: string; title: string };
  inviter: {
    id: string;
    producerName: string;
    profileImageUrl: string | null;
  };
  invitee: {
    id: string;
    producerName: string;
    profileImageUrl: string | null;
  };
}

export interface CreatorProfileSummary {
  userId: string;
  producerName: string;
  profileImageUrl: string | null;
  bio: string;
  roles: string[];
  genres: string[];
  skills: string[];
  experience: string;
  location: string;
  remotePref: string;
  availability: string;
  headline: string;
  portfolioLinks: string[];
  ratingAvg: number | null;
  ratingCount: number;
  memberSince: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
