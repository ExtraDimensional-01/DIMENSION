import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config — shared session/JWT shape only, no providers.
 * This is what middleware.ts uses directly (via its own lightweight
 * NextAuth(authConfig) instance) so the Edge Function bundle never pulls in
 * the Credentials provider's dependencies (bcrypt, Prisma, the Turso/libSQL
 * driver adapter) — those are Node.js-only and belong in auth.ts, which
 * spreads this same config and adds the provider for actual API routes.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "producer";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
