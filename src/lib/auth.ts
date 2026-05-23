import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        })]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        if (process.env.NODE_ENV === "production" && !user.emailVerified) return null;

        return {
          id: user.id,
          email: user.email,
          name: null,
          image: null,
          role: user.role,
          totpEnabled: user.totpEnabled,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session, account }) {
      // On sign-in: populate token from user/DB
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: Role }).role ?? Role.STUDENT;
        token.totpEnabled = (user as { totpEnabled?: boolean }).totpEnabled ?? false;
        token.totpVerified = false;
        // Fetch display name from DB (nickname takes priority over firstName+lastName)
        const dbProfile = await db.user.findUnique({
          where: { id: user.id as string },
          select: { firstName: true, lastName: true, nickname: true },
        });
        token.name = dbProfile?.nickname || [dbProfile?.firstName, dbProfile?.lastName].filter(Boolean).join(" ") || null;
      }

      // On Google sign-in: fetch role/totp/name from DB
      if (account?.provider === "google" && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, totpEnabled: true, firstName: true, lastName: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.totpEnabled = dbUser.totpEnabled;
          token.totpVerified = false;
          token.name = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || null;
        }
      }

      // On session update (e.g. after TOTP verification or profile name change)
      if (trigger === "update" && session) {
        if (session.totpVerified !== undefined) token.totpVerified = session.totpVerified;
        if (session.totpEnabled !== undefined) token.totpEnabled = session.totpEnabled;
        if (session.name !== undefined) token.name = session.name;
      }

      // Strip everything heavy — keep cookie tiny
      delete token.picture;
      delete token.name;

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.totpEnabled = token.totpEnabled as boolean;
      session.user.totpVerified = token.totpVerified as boolean;
      session.user.image = null;
      session.user.name = (token.name as string | null) ?? null;
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await db.user.findUnique({ where: { email: user.email } });
        if (!existing) {
          await db.user.create({
            data: {
              email: user.email,
              image: null,
              emailVerified: new Date(),
              role: Role.STUDENT,
            },
          });
        }
        return true;
      }
      return true;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  session: { strategy: "jwt" },
});
