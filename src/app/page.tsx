import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import LandingPage from "./LandingPage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const [tutorProfiles, studentCount, ratingAgg, topReviews] = await Promise.all([
    db.tutorProfile.findMany({
      where: { verificationStatus: "VERIFIED" },
      select: { languagesTaught: true },
    }),
    db.studentProfile.count({ where: { onboardingCompleted: true } }),
    db.review.aggregate({
      where: { isPublished: true, booking: { status: "COMPLETED" } },
      _avg: { ratingComposite: true },
      _count: { _all: true },
    }),
    db.review.findMany({
      where: { isPublished: true, text: { not: null }, booking: { status: "COMPLETED" } },
      take: 3,
      orderBy: { ratingComposite: "desc" },
      select: {
        text: true,
        ratingComposite: true,
        student: { select: { firstName: true, lastName: true } },
        tutor: {
          select: {
            tutorProfile: { select: { languagesTaught: true } },
          },
        },
      },
    }),
  ]);

  const languages = [...new Set(tutorProfiles.flatMap((p) => p.languagesTaught))].sort();
  const tutorCount = tutorProfiles.length;
  const avgRating = ratingAgg._avg.ratingComposite;
  const reviewCount = ratingAgg._count._all;

  const reviews = topReviews.map((r) => {
    const firstName = r.student.firstName ?? "";
    const lastInitial = r.student.lastName ? r.student.lastName[0] + "." : "";
    const name = firstName ? `${firstName} ${lastInitial}`.trim() : "Learner";
    const learningLang = r.tutor.tutorProfile?.languagesTaught[0] ?? "";
    return { text: r.text!, name, learningLang, rating: r.ratingComposite };
  });

  return (
    <LandingPage
      languages={languages}
      tutorCount={tutorCount}
      studentCount={studentCount}
      avgRating={avgRating}
      reviewCount={reviewCount}
      reviews={reviews}
    />
  );
}
