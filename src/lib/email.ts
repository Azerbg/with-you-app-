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

export async function sendRejectionEmail(
  email: string,
  fullName: string,
  reason: string,
  lang: string,
) {
  const isFr = lang !== "ar";
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: isFr ? "Votre candidature WithYou" : "طلبك على WithYou",
    html: isFr
      ? `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#5C3D00">Bonjour ${fullName},</h2>
        <p>Nous avons soigneusement examiné votre candidature pour devenir tuteur sur WithYou.</p>
        <p>Après étude de votre dossier, nous ne sommes malheureusement pas en mesure de donner suite à votre candidature pour le moment.</p>
        ${reason ? `<p style="background:#FFF3B0;padding:12px;border-radius:8px"><strong>Motif :</strong> ${reason}</p>` : ""}
        <p>Nous vous encourageons à postuler à nouveau dans le futur.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">WithYou · Plateforme d'apprentissage des langues</p>
      </div>`
      : `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;direction:rtl">
        <h2 style="color:#5C3D00">مرحباً ${fullName}،</h2>
        <p>لقد راجعنا طلبك للانضمام كمدرس على منصة WithYou.</p>
        <p>بعد دراسة ملفك، نأسف لإبلاغك بأننا لن نتمكن من المضي قدماً في طلبك في الوقت الحالي.</p>
        ${reason ? `<p style="background:#FFF3B0;padding:12px;border-radius:8px"><strong>السبب:</strong> ${reason}</p>` : ""}
        <p>نشجعك على التقديم مجدداً في المستقبل.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">WithYou · منصة تعلم اللغات</p>
      </div>`,
  });
}

export async function sendInterviewEmail(
  email: string,
  fullName: string,
  scheduledAt: Date,
  meetingUrl: string | null,
  lang: string,
) {
  const isFr = lang !== "ar";
  const tunisTime = new Intl.DateTimeFormat(isFr ? "fr-FR" : "ar-TN", {
    timeZone: "Africa/Tunis",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(scheduledAt);

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: isFr ? "WithYou — Entretien planifié" : "WithYou — موعد المقابلة",
    html: isFr
      ? `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#5C3D00">Bonjour ${fullName},</h2>
        <p>Votre entretien pour rejoindre WithYou en tant que tuteur a été planifié.</p>
        <div style="background:#FFF3B0;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:18px;font-weight:700;color:#5C3D00">📅 ${tunisTime}</p>
        </div>
        ${meetingUrl ? `<p>Lien de l'entretien : <a href="${meetingUrl}">${meetingUrl}</a></p>` : "<p>Le lien vous sera communiqué prochainement.</p>"}
        <p style="color:#6b7280;font-size:12px;margin-top:24px">WithYou · Plateforme d'apprentissage des langues</p>
      </div>`
      : `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;direction:rtl">
        <h2 style="color:#5C3D00">مرحباً ${fullName}،</h2>
        <p>تم تحديد موعد مقابلتك للانضمام إلى WithYou كمدرس.</p>
        <div style="background:#FFF3B0;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:18px;font-weight:700;color:#5C3D00">📅 ${tunisTime}</p>
        </div>
        ${meetingUrl ? `<p>رابط المقابلة: <a href="${meetingUrl}">${meetingUrl}</a></p>` : "<p>سيتم إرسال الرابط قريباً.</p>"}
        <p style="color:#6b7280;font-size:12px;margin-top:24px">WithYou · منصة تعلم اللغات</p>
      </div>`,
  });
}

export async function sendEmailOtpCode(email: string, otp: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Votre code de vérification WithYou",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <div style="background:#5C3D00;padding:24px 32px;border-radius:16px 16px 0 0;text-align:center">
          <span style="font-size:28px;font-weight:900;color:#F5C400;letter-spacing:-1px">WithYou</span>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #E8DFC8;border-top:none;border-radius:0 0 16px 16px">
          <h2 style="margin:0 0 8px;font-size:20px;color:#2D1A00">Confirmez votre adresse e-mail</h2>
          <p style="color:#6B5E44;font-size:14px;margin:0 0 24px">Utilisez le code ci-dessous pour vérifier votre adresse e-mail. Il expire dans 10 minutes.</p>
          <div style="background:#FFF3B0;border:2px solid #F5C400;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
            <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#5C3D00;font-family:monospace">${otp}</span>
          </div>
          <p style="color:#9B8A6B;font-size:12px;margin:0">Si vous n'avez pas demandé ce code, ignorez cet e-mail.</p>
        </div>
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
