import { z } from "zod";

export const USER_ROLES = ["producer", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  producerName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be under 50 characters"),
  role: z.enum(USER_ROLES),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const beatMetadataSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  bpm: z.coerce.number().int().min(20, "BPM seems too low").max(300, "BPM seems too high"),
  key: z.string().trim().min(1, "Key is required"),
  genre: z.string().trim().min(1, "Genre is required"),
  mood: z.string().trim().max(30).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(15, "Up to 15 tags")
    .optional()
    .default([]),
});

export const beatUpdateSchema = beatMetadataSchema.partial().extend({
  isPublic: z.boolean().optional(),
});

export const profileUpdateSchema = z.object({
  producerName: z.string().trim().min(2).max(50),
  bio: z.string().trim().max(1000).optional().default(""),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty").max(2000, "Message is too long"),
});

export const createOrderSchema = z.object({
  licenseId: z.string().trim().min(1, "Missing license"),
  paymentMethod: z.string().trim().min(1, "Choose a payment method").max(40, "Payment method is too long"),
});

export const orderActionSchema = z.object({
  action: z.enum(["confirm", "decline"]),
});

export const beatLicenseFieldsSchema = z.object({
  name: z.string().trim().min(1, "License name is required").max(60, "License name is too long"),
  terms: z.string().trim().max(2000, "Terms are too long").optional().default(""),
  isExclusive: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  includedFormats: z.array(z.string().trim().max(30)).max(10).optional().default([]),
  commercialUse: z.boolean().optional().default(true),
  distributionAllowed: z.boolean().optional().default(true),
  musicVideoAllowed: z.boolean().optional().default(true),
  performanceAllowed: z.boolean().optional().default(true),
  socialMediaAllowed: z.boolean().optional().default(true),
  streamLimit: z.number().int().min(0, "Enter a valid limit").nullable().optional(),
  salesLimit: z.number().int().min(0, "Enter a valid limit").nullable().optional(),
  creditRequired: z.boolean().optional().default(false),
  creditText: z.string().trim().max(300, "Credit text is too long").optional().default(""),
  otherRestrictions: z.string().trim().max(2000, "Restrictions are too long").optional().default(""),
});

export const beatLicenseUpdateSchema = beatLicenseFieldsSchema.partial();
