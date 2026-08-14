import { z } from "zod";
import {
  COLLAB_ROLES,
  REMOTE_PREFS,
  AVAILABILITY_STATUSES,
} from "@/lib/constants";

export const collabPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  lookingFor: z.enum(COLLAB_ROLES),
  description: z.string().trim().max(3000).optional().default(""),
  genre: z.string().trim().min(1, "Genre is required"),
  subgenre: z.string().trim().max(60).optional().default(""),
  mood: z.string().trim().max(60).optional().default(""),
  skillsNeeded: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  isPaid: z.boolean().optional().default(false),
  budgetMinCents: z.number().int().min(0).nullable().optional(),
  budgetMaxCents: z.number().int().min(0).nullable().optional(),
  locationType: z.enum(REMOTE_PREFS).optional().default("remote"),
  location: z.string().trim().max(120).optional().default(""),
  deadline: z.string().trim().optional().nullable(),
  contactPref: z.string().trim().max(40).optional().default("in_app"),
  status: z.enum(["draft", "open"]).optional().default("draft"),
});

export const collabPostUpdateSchema = collabPostSchema.partial();

export const applicationSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  proposedPriceCents: z.number().int().min(0).nullable().optional(),
  portfolioLinks: z.array(z.string().trim().url().max(300)).max(10).optional().default([]),
});

export const invitationSchema = z.object({
  postId: z.string().trim().min(1, "Select a collaboration"),
  inviteeId: z.string().trim().min(1),
  roleNeeded: z.enum(COLLAB_ROLES),
  message: z.string().trim().max(1000).optional().default(""),
});

export const creatorProfileSchema = z.object({
  roles: z.array(z.enum(COLLAB_ROLES)).min(1, "Pick at least one role").max(9),
  genres: z.array(z.string().trim().min(1).max(40)).max(15).optional().default([]),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  experience: z.string().trim().max(60).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  remotePref: z.enum(REMOTE_PREFS).optional().default("both"),
  availability: z.enum(AVAILABILITY_STATUSES).optional().default("open"),
  headline: z.string().trim().max(160).optional().default(""),
  portfolioLinks: z.array(z.string().trim().url().max(300)).max(10).optional().default([]),
});

export const collabTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200),
  dueDate: z.string().trim().optional().nullable(),
  assigneeId: z.string().trim().optional().nullable(),
});

export const collabTaskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  done: z.boolean().optional(),
  dueDate: z.string().trim().nullable().optional(),
  assigneeId: z.string().trim().nullable().optional(),
});

export const reviewSchema = z.object({
  revieweeId: z.string().trim().min(1),
  communication: z.number().int().min(1).max(5),
  reliability: z.number().int().min(1).max(5),
  qualityOfWork: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5),
  overall: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(""),
});

export const collabMessageSchema = z.object({
  body: z.string().trim().max(2000).optional().default(""),
});

export const collabProjectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(3000).optional(),
  releaseUrl: z.string().trim().url().max(300).nullable().optional(),
});
