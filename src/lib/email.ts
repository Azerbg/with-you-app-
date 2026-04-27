import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "WithYou <onboarding@resend.dev>";
const BASE_URL = process.env.AUTH_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, code: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[DEV] ✉️  Verification code for ${email}: ${code}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your WithYou verification code",
    html: `
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
    `,
  });
}

export async function sendTutorApplicationConfirmation(email: string, fullName: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Votre candidature WithYou a bien été reçue",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#5C3D00">Merci, ${fullName} !</h2>
        <p>Nous avons bien reçu votre candidature pour devenir tuteur sur WithYou.</p>
        <p>Notre équipe RH examinera votre dossier et vous contactera dans les <strong>3 à 5 jours ouvrables</strong>.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">WithYou · Plateforme d'apprentissage des langues</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${BASE_URL}/auth/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your WithYou password",
    html: `
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
    `,
  });
}
