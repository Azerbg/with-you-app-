import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApplicationStatus } from "@prisma/client";
import { sendRejectionEmail, sendInterviewEmail } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, interviewScheduledAt, interviewMeetingUrl, rejectionReason } = body;

  if (!Object.values(ApplicationStatus).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  }

  const updateData: Record<string, unknown> = { status };

  if (status === "REJECTED") {
    updateData.rejectedAt = new Date();
    updateData.reapplyAfter = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    if (rejectionReason) updateData.rejectionReason = rejectionReason;
  }

  if (status === "ACTIVE") {
    updateData.activatedAt = new Date();
  }

  if (status === "INTERVIEW_SCHEDULED") {
    if (interviewScheduledAt) updateData.interviewScheduledAt = new Date(interviewScheduledAt);
    if (interviewMeetingUrl) updateData.interviewMeetingUrl = interviewMeetingUrl;
  }

  if (status === "INTERVIEW_COMPLETE") {
    updateData.interviewCompletedAt = new Date();
  }

  const updated = await db.hrApplication.update({
    where: { id },
    data: updateData,
    include: { user: { select: { email: true } } },
  });

  // Send emails (non-blocking)
  const app = await db.hrApplication.findUnique({
    where: { id },
    select: { fullName: true, preferredLanguage: true, interviewScheduledAt: true, interviewMeetingUrl: true },
  });

  if (app) {
    const lang = app.preferredLanguage ?? "fr";

    if (status === "REJECTED") {
      sendRejectionEmail(
        updated.user.email,
        app.fullName,
        rejectionReason ?? "",
        lang
      ).catch(() => {});
    }

    if (status === "INTERVIEW_SCHEDULED" && app.interviewScheduledAt && app.interviewMeetingUrl) {
      sendInterviewEmail(
        updated.user.email,
        app.fullName,
        app.interviewScheduledAt,
        app.interviewMeetingUrl,
        lang
      ).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}
