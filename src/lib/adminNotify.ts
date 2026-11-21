import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

/**
 * Creates a notification for every ADMIN (and optionally HR) user.
 * Fire-and-forget — wrap in .catch(() => {}) at call sites.
 */
export async function notifyAdmins({
  type,
  title,
  body,
  link,
  includeHr = false,
}: {
  type: string;
  title: string;
  body?: string;
  link?: string;
  includeHr?: boolean;
}) {
  const roles: Role[] = includeHr ? ["ADMIN", "HR"] : ["ADMIN"];
  const admins = await db.user.findMany({
    where: { role: { in: roles } },
    select: { id: true },
  });
  if (admins.length === 0) return;

  await db.notification.createMany({
    data: admins.map(a => ({
      userId: a.id,
      type,
      title,
      body:  body ?? "",
      link:  link ?? null,
    })),
    skipDuplicates: true,
  });
}
