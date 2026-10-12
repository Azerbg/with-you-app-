import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      accountStatus: true, statusReason: true, statusUpdatedAt: true,
      createdAt: true, emailVerified: true, timezone: true,
      hrApplication: { select: { fullName: true, status: true } },
      studentProfile: { select: { cefrLevel: true, programTier: true, country: true, targetLanguage: true } },
      tutorProfile: { select: { averageRating: true, totalReviews: true, verificationTier: true, languagesTaught: true } },
      bookingsAsStudent: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, status: true, sessionType: true, studentPriceUsd: true, studentCurrency: true, scheduledAt: true, createdAt: true,
          tutor: { select: { firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
        },
      },
      bookingsAsTutor: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, status: true, sessionType: true, studentPriceUsd: true, studentCurrency: true, scheduledAt: true, createdAt: true,
          student: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      messageThreadsAsStudent: {
        orderBy: { lastMessageAt: "desc" },
        take: 10,
        select: {
          id: true, lastMessageAt: true,
          tutor: { select: { firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
          _count: { select: { messages: true } },
        },
      },
      messageThreadsAsTutor: {
        orderBy: { lastMessageAt: "desc" },
        take: 10,
        select: {
          id: true, lastMessageAt: true,
          student: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { messages: true } },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...user,
    createdAt: user.createdAt.toISOString(),
    emailVerified: user.emailVerified?.toISOString() ?? null,
    statusUpdatedAt: user.statusUpdatedAt?.toISOString() ?? null,
    bookingsAsStudent: user.bookingsAsStudent.map(b => ({
      ...b, scheduledAt: b.scheduledAt?.toISOString() ?? null, createdAt: b.createdAt.toISOString(),
    })),
    bookingsAsTutor: user.bookingsAsTutor.map(b => ({
      ...b, scheduledAt: b.scheduledAt?.toISOString() ?? null, createdAt: b.createdAt.toISOString(),
    })),
    messageThreadsAsStudent: user.messageThreadsAsStudent.map(t => ({
      ...t, lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
    })),
    messageThreadsAsTutor: user.messageThreadsAsTutor.map(t => ({
      ...t, lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { accountStatus, statusReason, role } = body;

  const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true, accountStatus: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent admin from changing their own role/status
  if (id === session!.user.id && (accountStatus || role)) {
    return NextResponse.json({ error: "Cannot modify your own account" }, { status: 403 });
  }

  // Reason required when freezing or blocking
  if (accountStatus && accountStatus !== "ACTIVE" && !statusReason?.trim()) {
    return NextResponse.json({ error: "reason_required" }, { status: 422 });
  }

  const data: Record<string, unknown> = {};
  if (accountStatus) {
    data.accountStatus = accountStatus;
    data.statusReason = statusReason?.trim() ?? null;
    data.statusUpdatedAt = new Date();
    data.statusUpdatedBy = session!.user.id;
  }
  if (role) data.role = role;

  const updated = await db.user.update({ where: { id }, data, select: { id: true, accountStatus: true, role: true } });

  // Audit log for status change
  if (accountStatus && accountStatus !== user.accountStatus) {
    db.auditLog.create({
      data: {
        actorId: session!.user.id,
        action: `STATUS_CHANGE_${accountStatus}`,
        targetEntity: "User",
        targetId: id,
        payloadBefore: { accountStatus: user.accountStatus },
        payloadAfter:  { accountStatus },
        reason: statusReason?.trim() ?? undefined,
      },
    }).catch(() => {});
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (id === session!.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { reason, confirmEmail } = body as { reason?: string; confirmEmail?: string };

  // Verify confirmed email matches
  const target = await db.user.findUnique({ where: { id }, select: { email: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!confirmEmail || confirmEmail.toLowerCase() !== target.email.toLowerCase()) {
    return NextResponse.json({ error: "email_mismatch" }, { status: 422 });
  }

  // Soft delete: anonymize PII, keep bookings/payments
  await db.user.update({
    where: { id },
    data: {
      email:         `deleted_${id}@withu.invalid`,
      firstName:     null,
      lastName:      null,
      nickname:      null,
      image:         null,
      password:      null,
      totpSecret:    null,
      totpEnabled:   false,
      referralCode:  null,
      accountStatus: "BLOCKED",
      statusReason:  "ACCOUNT_DELETED",
      statusUpdatedAt: new Date(),
      statusUpdatedBy: session!.user.id,
    },
  });

  // Audit log
  db.auditLog.create({
    data: {
      actorId: session!.user.id,
      action: "ANONYMIZE_USER",
      targetEntity: "User",
      targetId: id,
      reason: reason?.trim() ?? undefined,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
