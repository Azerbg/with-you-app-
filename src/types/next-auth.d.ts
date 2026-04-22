import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      totpVerified: boolean;
      totpEnabled: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    totpEnabled: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    totpVerified: boolean;
    totpEnabled: boolean;
  }
}
