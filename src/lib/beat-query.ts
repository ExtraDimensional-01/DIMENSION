import { Prisma } from "@prisma/client";

export const beatInclude = {
  producer: { select: { id: true, producerName: true, profileImage: true } },
  tags: { include: { tag: { select: { name: true } } } },
  licenses: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.BeatInclude;

export interface BeatFilters {
  q?: string;
  genre?: string;
  mood?: string;
  tag?: string;
  producerId?: string;
  sort?: string;
  bpmMin?: number;
  bpmMax?: number;
  /** Include unlisted (isPublic: false) beats — only ever true for an owner viewing their own content. */
  includePrivate?: boolean;
}

export function buildBeatWhere(filters: BeatFilters): Prisma.BeatWhereInput {
  const where: Prisma.BeatWhereInput = {};

  if (!filters.includePrivate) where.isPublic = true;
  if (filters.genre) where.genre = filters.genre;
  if (filters.mood) where.mood = filters.mood;
  if (filters.producerId) where.producerId = filters.producerId;
  if (filters.tag) where.tags = { some: { tag: { name: filters.tag } } };
  if (filters.bpmMin !== undefined || filters.bpmMax !== undefined) {
    where.bpm = {
      ...(filters.bpmMin !== undefined ? { gte: filters.bpmMin } : {}),
      ...(filters.bpmMax !== undefined ? { lte: filters.bpmMax } : {}),
    };
  }
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q } },
      { producer: { producerName: { contains: filters.q } } },
      { tags: { some: { tag: { name: { contains: filters.q } } } } },
    ];
  }

  return where;
}

export function buildBeatOrderBy(sort?: string): Prisma.BeatOrderByWithRelationInput {
  if (sort === "oldest") return { createdAt: "asc" };
  if (sort === "popular") return { playCount: "desc" };
  return { createdAt: "desc" };
}
