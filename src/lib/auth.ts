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

        // Only allow verified emails (skip in dev)
        if (process.env.NODE_ENV === "production" && !user.emailVerified) return null;

        return {
          id: user.id,
          email: user.email,
          name: null,
          image: user.image,
          role: user.role,
          totpEnabled: user.totpEnabled,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // On session update (used after TOTP verification)
      if (trigger === "update" && session?.totpVerified !== undefined) {
        token.totpVerified = session.totpVerified;
        if (session?.totpEnabled !== undefined) {
          token.totpEnabled = session.totpEnabled;
        }
        // Strip large fields on every update too
        delete token.picture;
        delete token.name;
        return token;
      }

      // On initial sign-in, attach role and totp state to token
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: Role; totpEnabled: boolean }).role;
        const totpEnabled = (user as { role: Role; totpEnabled: boolean }).totpEnabled;
        token.totpEnabled = totpEnabled;
        // HR/ADMIN with TOTP enabled must verify on each login
        const needsTotp = (token.role === "HR" || token.role === "ADMIN") && totpEnabled;
        token.totpVerified = !needsTotp;
      }

      // If Google sign-in, fetch or create user to get role
      if (account?.provider === "google" && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.totpEnabled = dbUser.totpEnabled;
          token.totpVerified = true; // Google users skip TOTP
        }
      }

      // Always strip large/unused fields to keep cookie small
      delete token.picture;
      delete token.name;

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.totpVerified = token.totpVerified as boolean;
        session.user.totpEnabled = token.totpEnabled as boolean;
        // Don't store image/name in session cookie — fetch from DB when needed
        session.user.image = null;
        session.user.name = null;
      }
      return session;
    },

    async signIn({ user, account }) {
      // Handle Google OAuth: create user if first time
      if (account?.provider === "google" && user.email) {
        const existing = await db.user.findUnique({
          where: { email: user.email },
        });

        if (!existing) {
          await db.user.create({
            data: {
              email: user.email,
              image: user.image ?? null,
              emailVerified: new Date(),
              role: Role.STUDENT,
            },
          });
        }
        return true;
      }

      // Credentials: already validated in authorize()
      return true;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  session: { strategy: "jwt" },
});
