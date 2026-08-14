import { Prisma } from "@prisma/client";

export const collabPostInclude = {
  creator: {
    select: {
      id: true,
      producerName: true,
      profileImage: true,
      creatorProfile: { select: { ratingAvg: true, ratingCount: true } },
    },
  },
  files: true,
  _count: { select: { applications: true } },
} satisfies Prisma.CollaborationPostInclude;

export interface CollabPostFilters {
  q?: string;
  lookingFor?: string;
  genre?: string;
  location?: string;
  locationType?: string;
  skill?: string;
  isPaid?: boolean;
  sort?: string;
  creatorId?: string;
  /** Include drafts — only ever true for the creator viewing their own posts. */
  includeDrafts?: boolean;
  statusIn?: string[];
}

/**
 * `roles`/`genres`/`skills`/`skillsNeeded` are stored as JSON-encoded string
 * arrays (SQLite has no array column type in Prisma). Matching a single value
 * MUST use a quoted substring so `"Engineer"` doesn't false-positive match
 * `"Mix/Master Engineer"`.
 */
export function jsonArrayContains(value: string): Prisma.StringFilter {
  return { contains: JSON.stringify(value) };
}

export function buildCollabPostWhere(filters: CollabPostFilters): Prisma.CollaborationPostWhereInput {
  const where: Prisma.CollaborationPostWhereInput = {};

  if (filters.includeDrafts) {
    if (filters.creatorId) where.creatorId = filters.creatorId;
  } else {
    where.status = filters.statusIn ? { in: filters.statusIn } : { not: "draft" };
    if (filters.creatorId) where.creatorId = filters.creatorId;
  }

  if (filters.lookingFor) where.lookingFor = filters.lookingFor;
  if (filters.genre) where.genre = filters.genre;
  if (filters.locationType) where.locationType = filters.locationType;
  if (filters.location) where.location = { contains: filters.location };
  if (filters.isPaid !== undefined) where.isPaid = filters.isPaid;
  if (filters.skill) where.skillsNeeded = jsonArrayContains(filters.skill);

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q } },
      { description: { contains: filters.q } },
      { genre: { contains: filters.q } },
      { skillsNeeded: { contains: filters.q } },
      { creator: { producerName: { contains: filters.q } } },
    ];
  }

  return where;
}

export function buildCollabPostOrderBy(sort?: string): Prisma.CollaborationPostOrderByWithRelationInput {
  if (sort === "oldest") return { createdAt: "asc" };
  if (sort === "popular") return { applications: { _count: "desc" } };
  return { createdAt: "desc" };
}
