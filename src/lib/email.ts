const FROM = { name: "WithYou", email: "azer.boughrara@polytechnicien.tn" };
const BASE_URL = process.env.AUTH_URL ?? "http://localhost:3000";

async function send(to: string, subject: string, html: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log(`\n[DEV] Email to ${to} — ${subject}\n`);
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: FROM,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo error ${res.status}: ${body}`);
  }
}

export async function sendVerificationEmail(email: string, code: string) {
  await send(email, "Your WithYou verification code", `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#FFFDF5;border-radius:20px;overflow:hidden;border:1px solid #F5C400;">
            <tr>
              <td style="background:#5C3D00;padding:32px 40px;text-align:center;">
                <h1 style="color:#F5C400;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">WithYou</h1>
                <p style="color:#C49200;margin:4px 0 0;font-size:13px;letter-spacing:0.5px;">Language Learning Platform</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="color:#5C3D00;margin:0 0 10px;font-size:22px;font-weight:700;">Verify your email</h2>
                <p style="color:#6B5E44;margin:0 0 32px;font-size:15px;line-height:1.7;">
                  Enter this 6-digit code to activate your account.<br>
                  The code expires in <strong style="color:#5C3D00;">10 minutes</strong>.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#FFF3B0;border:2px solid #F5C400;border-radius:14px;padding:28px 20px;text-align:center;">
                      <p style="color:#8B6914;margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Verification Code</p>
                      <p style="color:#5C3D00;margin:0;font-size:44px;font-weight:900;letter-spacing:14px;font-family:'Courier New',monospace;">${code}</p>
                    </td>
                  </tr>
                </table>
                <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:28px 0 0;line-height:1.6;">
                  If you didn't create a WithYou account, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#FAF8F0;border-top:1px solid #F5E88A;padding:20px 40px;text-align:center;">
                <p style="color:#B8A98A;font-size:12px;margin:0;">© 2026 WithYou · All rights reserved</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `);
}

export async function sendRejectionEmail(email: string, fullName: string, reason: string, lang = "fr") {
  const fr = lang === "fr";
  const subject = fr ? "Décision concernant votre candidature WithYou" : "Update on your WithYou application";
  await send(email, subject, `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#FFFDF5;border-radius:16px;overflow:hidden;border:1px solid #E8E0D4;">
      <div style="background:#5C3D00;padding:28px 32px;">
        <h1 style="color:#F5C400;margin:0;font-size:22px;font-weight:800;">WithYou</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#5C3D00;margin:0 0 12px;">${fr ? `Bonjour ${fullName},` : `Hello ${fullName},`}</h2>
        <p style="color:#5C4A35;line-height:1.7;margin:0 0 16px;">
          ${fr
            ? "Après examen attentif de votre dossier, nous ne sommes pas en mesure de donner suite à votre candidature pour le moment."
            : "After careful review of your application, we are unable to move forward at this time."}
        </p>
        ${reason ? `<div style="background:#FAF8F0;border-left:3px solid #F5C400;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px;">
          <p style="color:#5C3D00;margin:0;font-size:14px;">${reason}</p>
        </div>` : ""}
        <p style="color:#5C4A35;line-height:1.7;margin:0 0 16px;">
          ${fr
            ? "Vous pourrez soumettre une nouvelle candidature dans 90 jours. Nous vous encourageons à continuer à développer votre profil."
            : "You may reapply in 90 days. We encourage you to continue developing your profile."}
        </p>
        <p style="color:#9B8A6B;font-size:12px;margin:24px 0 0;">WithYou · ${fr ? "Plateforme d'apprentissage des langues" : "Language Learning Platform"}</p>
      </div>
    </div>
  `);
}

export async function sendInterviewEmail(
  email: string,
  fullName: string,
  scheduledAt: Date,
  meetingUrl: string,
  lang = "fr"
) {
  const fr = lang === "fr";
  const dateStr = scheduledAt.toLocaleString(fr ? "fr-FR" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis",
  });
  const subject = fr ? "Votre entretien WithYou est planifié !" : "Your WithYou interview is scheduled!";
  await send(email, subject, `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#FFFDF5;border-radius:16px;overflow:hidden;border:1px solid #E8E0D4;">
      <div style="background:#5C3D00;padding:28px 32px;">
        <h1 style="color:#F5C400;margin:0;font-size:22px;font-weight:800;">WithYou</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#5C3D00;margin:0 0 12px;">${fr ? `Félicitations, ${fullName} !` : `Congratulations, ${fullName}!`}</h2>
        <p style="color:#5C4A35;line-height:1.7;margin:0 0 20px;">
          ${fr
            ? "Votre candidature a été sélectionnée. Votre entretien avec l'équipe RH WithYou est planifié."
            : "Your application has been selected. Your interview with the WithYou HR team is scheduled."}
        </p>
        <div style="background:#FFF3B0;border:1px solid #F5C400;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 8px;color:#5C3D00;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
            ${fr ? "Date & Heure (heure de Tunis)" : "Date & Time (Tunisia time)"}
          </p>
          <p style="margin:0 0 16px;color:#2D1A00;font-size:16px;font-weight:700;">${dateStr}</p>
          <a href="${meetingUrl}" style="display:inline-block;background:#F5C400;color:#5C3D00;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;">
            ${fr ? "Rejoindre l'entretien" : "Join the interview"}
          </a>
        </div>
        <p style="color:#6B5E44;font-size:13px;line-height:1.6;margin:0;">
          ${fr
            ? "Rejoignez la salle quelques minutes avant l'heure prévue. Assurez-vous que votre caméra et votre microphone fonctionnent."
            : "Join the room a few minutes before the scheduled time. Make sure your camera and microphone are working."}
        </p>
        <p style="color:#9B8A6B;font-size:12px;margin:24px 0 0;">WithYou · ${fr ? "Plateforme d'apprentissage des langues" : "Language Learning Platform"}</p>
      </div>
    </div>
  `);
}

export async function sendBookingConfirmationEmail(
  email: string,
  {
    studentName,
    tutorName,
    scheduledAt,
    bookingId,
  }: { studentName: string; tutorName: string; scheduledAt: Date; bookingId: string },
) {
  const BASE = process.env.AUTH_URL ?? "http://localhost:3000";
  const dateStr = scheduledAt.toLocaleString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  });

  await send(email, "Votre séance de découverte WithYou est confirmée !", `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#FFFDF5;border-radius:16px;overflow:hidden;border:1px solid #E8E0D4;">
      <div style="background:#5C3D00;padding:28px 32px;">
        <h1 style="color:#F5C400;margin:0;font-size:22px;font-weight:800;">WithYou</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#5C3D00;margin:0 0 12px;">Bonjour ${studentName} !</h2>
        <p style="color:#5C4A35;line-height:1.7;margin:0 0 20px;">
          Votre séance de découverte avec <strong>${tutorName}</strong> est confirmée.
        </p>
        <div style="background:#FFF3B0;border:1px solid #F5C400;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 6px;color:#5C3D00;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Date &amp; Heure (heure de Tunis)</p>
          <p style="margin:0 0 4px;color:#2D1A00;font-size:16px;font-weight:700;">${dateStr}</p>
          <p style="margin:0;color:#6B5E44;font-size:13px;">Durée : 30 minutes · Tarif : 15 USD</p>
        </div>
        <p style="color:#6B5E44;font-size:13px;line-height:1.6;margin:0 0 20px;">
          Un lien de visioconférence vous sera envoyé 24h avant la séance.<br>
          Référence de réservation : <code style="color:#5C3D00;font-weight:600;">${bookingId.slice(0, 8).toUpperCase()}</code>
        </p>
        <a href="${BASE}/dashboard/student" style="display:inline-block;background:#F5C400;color:#5C3D00;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;">
          Voir mes séances →
        </a>
        <p style="color:#9B8A6B;font-size:12px;margin:24px 0 0;">WithYou · Plateforme d&apos;apprentissage des langues</p>
      </div>
    </div>
  `);
}

export async function sendTutorApplicationConfirmation(email: string, fullName: string) {
  await send(email, "Votre candidature WithYou a bien été reçue", `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#5C3D00">Merci, ${fullName} !</h2>
      <p>Nous avons bien reçu votre candidature pour devenir tuteur sur WithYou.</p>
      <p>Notre équipe RH examinera votre dossier et vous contactera dans les <strong>3 à 5 jours ouvrables</strong>.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">WithYou · Plateforme d'apprentissage des langues</p>
    </div>
  `);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${BASE_URL}/auth/reset-password?token=${token}`;
  await send(email, "Reset your WithYou password", `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#FFFDF5;border-radius:20px;overflow:hidden;border:1px solid #F5C400;">
            <tr>
              <td style="background:#5C3D00;padding:32px 40px;text-align:center;">
                <h1 style="color:#F5C400;margin:0;font-size:26px;font-weight:800;">WithYou</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="color:#5C3D00;margin:0 0 12px;font-size:20px;">Reset your password</h2>
                <p style="color:#6B5E44;margin:0 0 28px;font-size:15px;line-height:1.7;">
                  Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
                </p>
                <table cellpadding="0" cellspacing="0"><tr><td>
                  <a href="${url}" style="display:inline-block;background:#F5C400;color:#5C3D00;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;">Reset Password</a>
                </td></tr></table>
                <p style="color:#9CA3AF;font-size:12px;margin:28px 0 0;">
                  If you didn't request a password reset, ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#FAF8F0;border-top:1px solid #F5E88A;padding:20px 40px;text-align:center;">
                <p style="color:#B8A98A;font-size:12px;margin:0;">© 2026 WithYou · All rights reserved</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `);
}
