import { Prisma } from "@prisma/client";
import { jsonArrayContains } from "@/lib/collab-query";

export const creatorProfileInclude = {
  user: { select: { id: true, producerName: true, profileImage: true, bio: true, createdAt: true } },
} satisfies Prisma.CreatorProfileInclude;

export interface CreatorFilters {
  q?: string;
  role?: string;
  genre?: string;
  skill?: string;
  location?: string;
  availability?: string;
}

export function buildCreatorWhere(filters: CreatorFilters): Prisma.CreatorProfileWhereInput {
  const where: Prisma.CreatorProfileWhereInput = {};

  if (filters.role) where.roles = jsonArrayContains(filters.role);
  if (filters.genre) where.genres = jsonArrayContains(filters.genre);
  if (filters.skill) where.skills = jsonArrayContains(filters.skill);
  if (filters.availability) where.availability = filters.availability;
  if (filters.location) where.location = { contains: filters.location };

  if (filters.q) {
    where.OR = [
      { headline: { contains: filters.q } },
      { skills: { contains: filters.q } },
      { genres: { contains: filters.q } },
      { user: { producerName: { contains: filters.q } } },
    ];
  }

  return where;
}
