import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import TutorReviewsClient from "./TutorReviewsClient";
import { cookies } from "next/headers";

export async function generateMetadata() {
  const lang = (await cookies()).get("wy_lang")?.value === "en" ? "en" : "fr";
  return { title: lang === "en" ? "Reviews — WithYou" : "Avis — WithYou" };
}

export default async function TutorReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const reviews = await db.review.findMany({
    where: { tutorId: session.user.id, isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ratingComposite: true,
      text: true,
      tutorResponse: true,
      tutorRespondedAt: true,
      createdAt: true,
      student: { select: { firstName: true, lastName: true } },
    },
  });

  const serialized = reviews.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    tutorRespondedAt: r.tutorRespondedAt?.toISOString() ?? null,
  }));

  return <TutorReviewsClient reviews={serialized} />;
}
