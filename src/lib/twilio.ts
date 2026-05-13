/**
 * Send an SMS OTP via Twilio.
 * If TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER are not set,
 * the function runs in dev-mode and returns the OTP in the response so it can
 * be displayed in the UI for testing without a real SIM card.
 */
export async function sendSmsOtp(
  phone: string,
  otp: string
): Promise<{ success: boolean; devMode: boolean }> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } =
    process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log(`[Twilio DEV] OTP for ${phone}: ${otp}`);
    return { success: true, devMode: true };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = `Your WithYou verification code is: ${otp}. Valid for 10 minutes.`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      To: phone,
      From: TWILIO_PHONE_NUMBER,
      Body: body,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Twilio]", res.status, text);
    return { success: false, devMode: false };
  }

  return { success: true, devMode: false };
}
