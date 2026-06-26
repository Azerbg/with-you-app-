import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = 30;

  const where = search ? {
    OR: [
      { student: { email:     { contains: search, mode: "insensitive" as const } } },
      { student: { firstName: { contains: search, mode: "insensitive" as const } } },
      { tutor:   { firstName: { contains: search, mode: "insensitive" as const } } },
      { tutor:   { hrApplication: { fullName: { contains: search, mode: "insensitive" as const } } } },
    ],
  } : {};

  const [threads, total] = await Promise.all([
    db.messageThread.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, lastMessageAt: true,
        student: { select: { id: true, email: true, firstName: true, lastName: true } },
        tutor:   { select: { id: true, email: true, firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
        _count:  { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, createdAt: true, senderId: true } },
      },
    }),
    db.messageThread.count({ where }),
  ]);

  return NextResponse.json({
    threads: threads.map(t => ({
      ...t,
      lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
      messages: t.messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
    })),
    total,
    pages: Math.ceil(total / limit),
  });
}
