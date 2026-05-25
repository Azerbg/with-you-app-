import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

const FROM = process.env.EMAIL_FROM ?? "noreply@withyou.com";
const BASE_URL = process.env.AUTH_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${BASE_URL}/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Verify your WithYou account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Welcome to WithYou!</h2>
        <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${url}" style="display:inline-block;background:#F5C400;color:#5C3D00;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendTutorApplicationConfirmation(email: string, fullName: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Votre candidature WithYou a bien été reçue",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#5C3D00">Merci, ${fullName} !</h2>
        <p>Nous avons bien reçu votre candidature pour devenir tuteur sur WithYou.</p>
        <p>Notre équipe RH examinera votre dossier et vous contactera dans les <strong>3 à 5 jours ouvrables</strong>.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          WithYou · Plateforme d'apprentissage des langues
        </p>
      </div>
    `,
  });
}

export async function sendBookingConfirmationEmail(params: {
  studentEmail: string;
  tutorEmail: string;
  scheduledAt: Date;
  durationMins: number;
  bookingId: string;
  meetingUrl: string | null;
}) {
  const { studentEmail, tutorEmail, scheduledAt, durationMins, bookingId, meetingUrl } = params;

  const fmt = (tz: string, locale = "fr-FR") =>
    new Intl.DateTimeFormat(locale, {
      timeZone: tz, weekday: "long", day: "numeric", month: "long",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    }).format(scheduledAt);

  const tunisTime  = fmt("Africa/Tunis");
  const canadaTime = fmt("America/Toronto", "fr-CA");
  const confirmUrl = `${BASE_URL}/booking/confirmation/${bookingId}`;

  const meetingBlock = meetingUrl
    ? `<p>Lien de la séance : <a href="${meetingUrl}">${meetingUrl}</a></p>`
    : `<p>Le lien de la séance vous sera envoyé prochainement.</p>`;

  // Student email
  await transporter.sendMail({
    from: FROM,
    to: studentEmail,
    subject: "WithYou — Réservation confirmée !",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#5C3D00">Réservation confirmée !</h2>
        <p>Votre séance de <strong>${durationMins} minutes</strong> est confirmée :</p>
        <div style="background:#FFF3B0;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:18px;font-weight:700;color:#5C3D00">📅 ${tunisTime}</p>
        </div>
        ${meetingBlock}
        <a href="${confirmUrl}" style="display:inline-block;background:#5C3D00;color:#F5C400;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:700">
          Voir ma réservation →
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">WithYou · Plateforme d'apprentissage des langues</p>
      </div>
    `,
  });

  // Tutor email
  await transporter.sendMail({
    from: FROM,
    to: tutorEmail,
    subject: "WithYou — Nouvelle réservation confirmée",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#5C3D00">Nouvelle séance réservée</h2>
        <p>Une séance de <strong>${durationMins} minutes</strong> a été réservée :</p>
        <div style="background:#FFF3B0;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:4px 0">🇹🇳 <strong>Heure Tunis :</strong> ${tunisTime}</p>
          <p style="margin:4px 0">🇨🇦 <strong>Heure Canada :</strong> ${canadaTime}</p>
        </div>
        ${meetingBlock}
        <p style="color:#6b7280;font-size:12px;margin-top:24px">WithYou · Plateforme d'apprentissage des langues</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${BASE_URL}/auth/reset-password?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Reset your WithYou password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Reset your password</h2>
        <p>Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${url}" style="display:inline-block;background:#F5C400;color:#5C3D00;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
