import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: false,
  auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
});

const BASE_URL = process.env.AUTH_URL ?? "http://localhost:3000";
const TUNIS_TZ = "Africa/Tunis";

function formatInTz(iso: string, tz: string, locale = "fr-FR") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(iso));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId, slots, meetingUrl } = await req.json() as {
    applicationId: string;
    slots: string[];      // UTC ISO strings (1-3 slots)
    meetingUrl?: string;
  };

  if (!applicationId || !Array.isArray(slots) || slots.length === 0 || slots.length > 3) {
    return NextResponse.json({ error: "Provide 1-3 slots" }, { status: 422 });
  }

  // Validate ISO dates
  for (const s of slots) {
    if (isNaN(new Date(s).getTime())) {
      return NextResponse.json({ error: `Invalid date: ${s}` }, { status: 422 });
    }
  }

  const app = await db.hrApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = randomBytes(24).toString("hex");

  await db.hrApplication.update({
    where: { id: applicationId },
    data: {
      interviewSlots: slots,
      interviewToken: token,
      interviewMeetingUrl: meetingUrl ?? app.interviewMeetingUrl,
      interviewSelectedAt: null, // reset if re-proposing
    },
  });

  // Build slot list for email (Tunisia time)
  const slotLines = slots.map((s, i) =>
    `<li style="margin:8px 0"><strong>Créneau ${i + 1} :</strong> ${formatInTz(s, TUNIS_TZ)}</li>`
  ).join("");

  const selectionUrl = `${BASE_URL}/interview/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@withyou.com",
    to: app.user.email,
    subject: "WithYou — Invitation à un entretien 🎉",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#5C3D00">Félicitations ${app.fullName} !</h2>
        <p>Votre candidature a été présélectionnée. Nous aimerions vous inviter à un entretien avec notre équipe.</p>
        <p><strong>Veuillez choisir l'un des créneaux suivants</strong> (heure de Tunis) :</p>
        <ul style="padding-left:20px">${slotLines}</ul>
        <a href="${selectionUrl}" style="display:inline-block;margin:20px 0;background:#F5C400;color:#5C3D00;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px">
          Choisir mon créneau →
        </a>
        <p style="color:#6b7280;font-size:12px">
          Ce lien expire après la sélection d'un créneau.<br>
          WithYou · Plateforme d'apprentissage des langues
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true, token, selectionUrl });
}
