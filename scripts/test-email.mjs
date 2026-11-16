/**
 * Test email delivery via Brevo.
 * Usage: node scripts/test-email.mjs <recipient@example.com>
 *
 * Loads .env automatically. Run from project root.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually (no dotenv dependency needed)
try {
  const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=["']?(.+?)["']?\s*$/);
    if (match) process.env[match[1]] ??= match[2];
  }
} catch { /* .env not found */ }

const BREVO_KEY  = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? "noreply@withyou.com";
const TO_EMAIL   = process.argv[2];

if (!TO_EMAIL) {
  console.error("Usage: node scripts/test-email.mjs <recipient@example.com>");
  process.exit(1);
}

if (!BREVO_KEY) {
  console.error("❌  BREVO_API_KEY is not set in .env");
  process.exit(1);
}

console.log(`\n📧  Sending test email to: ${TO_EMAIL}`);
console.log(`    From: ${FROM_EMAIL}`);
console.log(`    Key: ${BREVO_KEY.slice(0, 20)}...`);

const payload = {
  sender:      { name: "WithYou Learning", email: FROM_EMAIL },
  to:          [{ email: TO_EMAIL }],
  replyTo:     { email: FROM_EMAIL },
  subject:     "WithYou — Test d'envoi / Delivery test",
  htmlContent: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <div style="background:#3d2900;padding:20px 32px;border-radius:12px 12px 0 0;text-align:center">
        <span style="font-size:22px;font-weight:900">
          <span style="color:#fff">With</span><span style="color:#F5C400">You</span>
        </span>
      </div>
      <div style="background:#fff;padding:28px 32px;border:1px solid #E8DFC8;border-top:none;border-radius:0 0 12px 12px">
        <h2 style="color:#2D1A00;margin:0 0 12px">Test réussi ✅</h2>
        <p style="color:#6B5E44;font-size:14px">
          Cet e-mail confirme que Brevo est correctement configuré pour WithYou Learning.
        </p>
        <p style="color:#9B8A6B;font-size:12px;margin-top:20px">
          This email confirms Brevo is correctly set up for WithYou Learning.
        </p>
      </div>
    </div>
  `,
  textContent: "WithYou Learning — Brevo is correctly configured. / Brevo est correctement configuré.",
};

try {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json();

  if (res.ok) {
    console.log("\n✅  Email sent successfully!");
    console.log(`    Message ID: ${body.messageId ?? "(none)"}`);
    console.log("\n👉  Check the recipient inbox (and spam folder).\n");
  } else {
    console.error("\n❌  Brevo returned an error:");
    console.error(`    Status: ${res.status}`);
    console.error(`    Code:   ${body.code ?? "?"}`);
    console.error(`    Message: ${body.message ?? JSON.stringify(body)}`);

    if (body.code === "unauthorized") {
      console.error("\n💡  The API key is disabled or invalid.");
      console.error("    → Go to brevo.com → My Account → SMTP & API → API Keys → Generate new key");
    }
    if (body.code === "sender_not_allowed") {
      console.error("\n💡  The sender email is not verified in Brevo.");
      console.error(`    → Go to brevo.com → Senders & IPs → Senders → Add "${FROM_EMAIL}"`);
    }
    process.exit(1);
  }
} catch (err) {
  console.error("\n❌  Network error:", err.message);
  process.exit(1);
}
