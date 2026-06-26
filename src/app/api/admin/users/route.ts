import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const role   = searchParams.get("role") ?? "";
  const status = searchParams.get("status") ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = 20;

  const where: Record<string, unknown> = {};
  if (role && role !== "ALL")   where.role = role;
  if (status && status !== "ALL") where.accountStatus = status;
  if (search) {
    where.OR = [
      { email:     { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName:  { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, accountStatus: true, statusReason: true,
        createdAt: true, emailVerified: true,
        hrApplication: { select: { fullName: true, status: true } },
        _count: { select: { bookingsAsStudent: true, bookingsAsTutor: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      emailVerified: u.emailVerified?.toISOString() ?? null,
    })),
    total,
    pages: Math.ceil(total / limit),
  });
}
