import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const skip = Math.max(0, parseInt(url.searchParams.get("skip") ?? "0", 10));
  const take = Math.min(20, Math.max(1, parseInt(url.searchParams.get("take") ?? "8", 10)));

  const reviews = await db.review.findMany({
    where: { tutorId: id, isPublished: true },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      ratingComposite: true,
      text: true,
      createdAt: true,
      student: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(
    reviews.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
  );
}
