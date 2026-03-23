// @version 0.3.0 - Signal: Twilio client and webhook verification
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";

export const twilioClient = twilio(accountSid, authToken);

/**
 * Verify that an incoming request is from Twilio.
 * Uses the X-Twilio-Signature header and the auth token.
 */
export function verifyTwilioWebhook(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Send an SMS reply via Twilio.
 */
export async function sendSms(
  to: string,
  body: string
): Promise<{ sid: string }> {
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER ?? "";
  const message = await twilioClient.messages.create({
    to,
    from: twilioPhone,
    body,
  });
  return { sid: message.sid };
}
