import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: false,
  auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
});

function formatInTz(iso: string, tz: string, locale = "fr-FR") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(iso));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { slotIndex } = await req.json() as { slotIndex: number };

  const app = await db.hrApplication.findUnique({
    where: { interviewToken: token },
    include: { user: true },
  });

  if (!app) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (app.interviewSelectedAt) return NextResponse.json({ error: "already_selected" }, { status: 409 });

  const slot = app.interviewSlots[slotIndex];
  if (!slot) return NextResponse.json({ error: "invalid_slot" }, { status: 422 });

  const selectedAt = new Date(slot);

  await db.hrApplication.update({
    where: { id: app.id },
    data: {
      interviewSelectedAt: selectedAt,
      interviewScheduledAt: selectedAt,
      status: "INTERVIEW_SCHEDULED",
    },
  });

  const TUNIS_TZ  = "Africa/Tunis";
  const CANADA_TZ = "America/Toronto";

  const tunisTime  = formatInTz(slot, TUNIS_TZ);
  const canadaTime = formatInTz(slot, CANADA_TZ, "fr-CA");
  const meetingUrl = app.interviewMeetingUrl;

  // Email to candidate
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@withyou.com",
    to: app.user.email,
    subject: "WithYou — Confirmation de votre entretien",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#5C3D00">Entretien confirmé !</h2>
        <p>Bonjour ${app.fullName},</p>
        <p>Votre entretien est planifié pour :</p>
        <div style="background:#FFF3B0;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:18px;font-weight:700;color:#5C3D00">📅 ${tunisTime}</p>
        </div>
        ${meetingUrl ? `
        <p>Lien de l'entretien :</p>
        <a href="${meetingUrl}" style="display:inline-block;background:#5C3D00;color:#F5C400;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:700">
          Rejoindre l'entretien →
        </a>` : `<p>Le lien de l'entretien vous sera envoyé prochainement.</p>`}
        <p style="color:#6b7280;font-size:12px;margin-top:24px">WithYou · Plateforme d'apprentissage des langues</p>
      </div>
    `,
  });

  // Email to HR team
  if (process.env.HR_EMAIL) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@withyou.com",
      to: process.env.HR_EMAIL,
      subject: `WithYou RH — Entretien confirmé : ${app.fullName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#5C3D00">Entretien confirmé</h2>
          <p><strong>${app.fullName}</strong> (${app.user.email}) a sélectionné un créneau :</p>
          <div style="background:#FFF3B0;border-radius:12px;padding:16px;margin:16px 0">
            <p style="margin:4px 0">🇹🇳 <strong>Heure Tunis :</strong> ${tunisTime}</p>
            <p style="margin:4px 0">🇨🇦 <strong>Heure Canada :</strong> ${canadaTime}</p>
          </div>
          ${meetingUrl ? `<p>Lien : <a href="${meetingUrl}">${meetingUrl}</a></p>` : ""}
        </div>
      `,
    });
  }

  return NextResponse.json({ success: true, scheduledAt: selectedAt });
}
