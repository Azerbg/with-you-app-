import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: PrismaAdapter(db),
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
    async session({ session, user }) {
      // With database strategy, `user` is the DB user record
      if (user) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true, totpEnabled: true, email: true },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
          session.user.totpEnabled = dbUser.totpEnabled;
          // totpVerified is stored on the Session record itself
          const sessionRecord = await db.session.findFirst({
            where: { userId: dbUser.id, expires: { gt: new Date() } },
            orderBy: { expires: "desc" },
            select: { totpVerified: true },
          });
          const needsTotp = dbUser.role === "HR" || dbUser.role === "ADMIN";
          session.user.totpVerified = needsTotp
            ? (sessionRecord?.totpVerified ?? false)
            : true;
          session.user.image = null;
          session.user.name = null;
        }
      }
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await db.user.findUnique({ where: { email: user.email } });
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
      return true;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  session: { strategy: "database" },
});
