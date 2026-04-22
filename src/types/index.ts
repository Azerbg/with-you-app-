import { Role, ProgramTier, VerificationStatus } from "@prisma/client";

export type { Role, ProgramTier, VerificationStatus };

export interface UserSession {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
  image?: string | null;
}
