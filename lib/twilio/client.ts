import "server-only";

import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export const twilioConfigured =
  Boolean(accountSid && authToken);

export function getTwilioClient() {
  const accountSid =
    process.env.TWILIO_ACCOUNT_SID?.trim();

  const authToken =
    process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials are missing.",
    );
  }

  return twilio(
    accountSid,
    authToken,
  );
}