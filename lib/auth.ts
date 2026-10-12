import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { ROLES, type Role } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "University account",
      credentials: {
        email: { label: "University email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
          include: { student: { select: { id: true, name: true } } },
        });
        if (!user || !(await compare(credentials.password, user.passwordHash))) return null;
        const role = user.role as Role;
        if (!ROLES.includes(role)) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.student?.name ?? user.email,
          role,
          studentId: user.student?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role as (typeof ROLES)[number];
        token.studentId = user.studentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? "STUDENT";
        session.user.studentId = token.studentId ?? null;
      }
      return session;
    },
  },
};