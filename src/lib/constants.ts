export const GENRES = [
  "Hip Hop",
  "Trap",
  "R&B",
  "Pop",
  "Drill",
  "Lo-Fi",
  "Boom Bap",
  "Afrobeat",
  "EDM",
  "Reggaeton",
  "Rock",
  "Soul",
  "Jazz",
  "Cinematic",
  "Other",
] as const;

export const MOODS = [
  "Dark",
  "Melodic",
  "Aggressive",
  "Chill",
  "Sad",
  "Atmospheric",
  "Epic",
  "Hard",
  "Uplifting",
  "Energetic",
  "Dreamy",
  "Mysterious",
  "Romantic",
  "Triumphant",
  "Nostalgic",
] as const;

export const BPM_RANGES = [
  { label: "Any BPM", min: undefined, max: undefined },
  { label: "Under 90", min: undefined, max: 89 },
  { label: "90 – 110", min: 90, max: 110 },
  { label: "110 – 130", min: 110, max: 130 },
  { label: "130 – 150", min: 130, max: 150 },
  { label: "150 – 170", min: 150, max: 170 },
  { label: "170+", min: 170, max: undefined },
] as const;

export const MUSICAL_KEYS = [
  "C Major",
  "C Minor",
  "C# Major",
  "C# Minor",
  "D Major",
  "D Minor",
  "D# Major",
  "D# Minor",
  "E Major",
  "E Minor",
  "F Major",
  "F Minor",
  "F# Major",
  "F# Minor",
  "G Major",
  "G Minor",
  "G# Major",
  "G# Minor",
  "A Major",
  "A Minor",
  "A# Major",
  "A# Minor",
  "B Major",
  "B Minor",
] as const;

export const ALLOWED_AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
};

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_AUDIO_SIZE_BYTES = Number(
  process.env.MAX_AUDIO_SIZE_BYTES ?? 50 * 1024 * 1024
);
export const MAX_IMAGE_SIZE_BYTES = Number(
  process.env.MAX_IMAGE_SIZE_BYTES ?? 5 * 1024 * 1024
);

export const BEATS_PAGE_SIZE = 24;

/** Number of amplitude samples extracted per waveform. Kept small so it's cheap to store/render. */
export const WAVEFORM_PEAK_COUNT = 120;

// =============================================================================
// Collabs
// =============================================================================

export const COLLAB_ROLES = [
  "Artist",
  "Producer",
  "Songwriter",
  "Vocalist",
  "Engineer",
  "Mix/Master Engineer",
  "DJ",
  "Musician",
  "Other",
] as const;
export type CollabRole = (typeof COLLAB_ROLES)[number];

export const COLLAB_POST_STATUSES = [
  "draft",
  "open",
  "reviewing",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type CollabPostStatus = (typeof COLLAB_POST_STATUSES)[number];

export const APPLICATION_STATUSES = ["pending", "accepted", "declined", "withdrawn"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const INVITATION_STATUSES = ["pending", "accepted", "declined"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const PROJECT_STATUSES = ["in_progress", "completed", "cancelled"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const REMOTE_PREFS = ["remote", "in_person", "both"] as const;
export type RemotePref = (typeof REMOTE_PREFS)[number];

export const AVAILABILITY_STATUSES = ["open", "busy", "not_available"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "application_new",
  "application_accepted",
  "application_declined",
  "message_new",
  "invitation_new",
  "invitation_accepted",
  "project_file_new",
  "deadline_approaching",
  "collab_completed",
  "review_new",
  "order_new",
  "order_confirmed",
  "order_declined",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// =============================================================================
// Orders — buyer/seller-coordinated, trust-based beat purchases. DIMENSION
// never processes payment itself; the seller's confirmation is what unlocks
// full playback for the buyer.
// =============================================================================

export const PAYMENT_METHODS = ["CashApp", "Venmo", "PayPal", "Zelle", "Apple Pay", "Other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ORDER_STATUSES = ["pending", "confirmed", "declined"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Preset license tiers a producer can start from — every field below is editable after picking one. */
export const LICENSE_PRESETS = [
  {
    name: "MP3 Lease",
    defaultTerms:
      "Non-exclusive lease. Tagged or standard-quality MP3. Up to 5,000 streams/sales. Credit the producer. Producer retains ownership and may license this beat to others.",
    includedFormats: ["MP3"] as string[],
    commercialUse: true,
    distributionAllowed: true,
    musicVideoAllowed: true,
    performanceAllowed: true,
    socialMediaAllowed: true,
    streamLimit: 5000 as number | null,
    salesLimit: 5000 as number | null,
    creditRequired: true,
    creditText: "Must credit the producer in the track title or description.",
  },
  {
    name: "WAV Lease",
    defaultTerms:
      "Non-exclusive lease. Untagged WAV file. Up to 10,000 streams/sales. Credit the producer. Producer retains ownership and may license this beat to others.",
    includedFormats: ["WAV"] as string[],
    commercialUse: true,
    distributionAllowed: true,
    musicVideoAllowed: true,
    performanceAllowed: true,
    socialMediaAllowed: true,
    streamLimit: 10000 as number | null,
    salesLimit: 10000 as number | null,
    creditRequired: true,
    creditText: "Must credit the producer in the track title or description.",
  },
  {
    name: "Trackout Lease",
    defaultTerms:
      "Non-exclusive lease. Untagged WAV plus full trackout/stems (ZIP). Up to 50,000 streams/sales. Credit the producer. Producer retains ownership and may license this beat to others.",
    includedFormats: ["WAV", "Trackout/Stems"] as string[],
    commercialUse: true,
    distributionAllowed: true,
    musicVideoAllowed: true,
    performanceAllowed: true,
    socialMediaAllowed: true,
    streamLimit: 50000 as number | null,
    salesLimit: 50000 as number | null,
    creditRequired: true,
    creditText: "Must credit the producer in the track title or description.",
  },
  {
    name: "Unlimited Lease",
    defaultTerms:
      "Non-exclusive lease. Untagged WAV plus trackout. Unlimited streams/sales, monetization allowed. Credit the producer. Producer retains ownership and may license this beat to others.",
    includedFormats: ["WAV", "Trackout/Stems"] as string[],
    commercialUse: true,
    distributionAllowed: true,
    musicVideoAllowed: true,
    performanceAllowed: true,
    socialMediaAllowed: true,
    streamLimit: null as number | null,
    salesLimit: null as number | null,
    creditRequired: true,
    creditText: "Must credit the producer in the track title or description.",
  },
  {
    name: "Exclusive Rights",
    defaultTerms:
      "Exclusive rights — full ownership transfer. This beat is removed from sale to anyone else once purchased. Unlimited use.",
    includedFormats: ["WAV", "Trackout/Stems"] as string[],
    commercialUse: true,
    distributionAllowed: true,
    musicVideoAllowed: true,
    performanceAllowed: true,
    socialMediaAllowed: true,
    streamLimit: null as number | null,
    salesLimit: null as number | null,
    creditRequired: false,
    creditText: "",
  },
] as const;

/** Selectable labels for "formats included" on a license tier — informational, independent of the actual uploaded deliverable file. */
export const LICENSE_FORMAT_OPTIONS = ["MP3", "WAV", "Trackout/Stems", "MIDI", "Other"] as const;

/** MIME type -> extension, for the deliverable file attached to a license tier. */
export const ALLOWED_LICENSE_FILE_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

export const MAX_LICENSE_FILE_SIZE_BYTES = Number(
  process.env.MAX_LICENSE_FILE_SIZE_BYTES ?? 200 * 1024 * 1024
);

/** MIME type -> extension, for files attached to collab posts/applications/projects/messages. */
export const ALLOWED_PROJECT_FILE_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/midi": "mid",
  "audio/x-midi": "mid",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/** Categorizes a file extension for display/icon purposes. */
export function fileTypeCategory(ext: string): "wav" | "mp3" | "midi" | "zip" | "image" | "document" | "other" {
  const e = ext.toLowerCase();
  if (e === "wav") return "wav";
  if (e === "mp3") return "mp3";
  if (e === "mid" || e === "midi") return "midi";
  if (e === "zip") return "zip";
  if (["jpg", "jpeg", "png", "webp"].includes(e)) return "image";
  if (["pdf", "txt", "doc", "docx"].includes(e)) return "document";
  return "other";
}

export const MAX_PROJECT_FILE_SIZE_BYTES = Number(
  process.env.MAX_PROJECT_FILE_SIZE_BYTES ?? 200 * 1024 * 1024
);

export const COLLAB_POSTS_PAGE_SIZE = 20;
export const CREATORS_PAGE_SIZE = 24;
