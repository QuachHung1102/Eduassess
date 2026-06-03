/**
 * Edge-safe NextAuth config — KHÔNG import bcryptjs, pg, hay bất kỳ module Node.js native nào.
 * Dùng riêng cho proxy.ts (Edge Runtime).
 * Providers để trống vì chỉ cần JWT callbacks để đọc token.
 */
import type { NextAuthConfig } from "next-auth";
import type { Role, StaffPosition } from "@/lib/types";

export const edgeAuthConfig: NextAuthConfig = {
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  providers: [],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          role: Role;
          staffPosition: StaffPosition | null;
        };
        token.id = u.id;
        token.role = u.role;
        token.staffPosition = u.staffPosition ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = (token.id ?? token.sub) as string;
      session.user.role = token.role as Role;
      session.user.staffPosition = (token.staffPosition ?? null) as StaffPosition | null;
      return session;
    },
  },
};
