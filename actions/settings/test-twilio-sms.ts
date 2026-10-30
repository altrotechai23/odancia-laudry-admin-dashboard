"use server";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { sendTwilioTestSms } from "@/lib/notifications/service-sms";

export type TestTwilioSmsResult = {
  success: boolean;
  message: string;
  sid?: string | null;
};

export async function testTwilioSms(phoneInput: string): Promise<TestTwilioSmsResult> {
  await requireOwnerOrAdmin();

  const phone = phoneInput.trim();
  if (!phone || phone.length > 32) {
    return { success: false, message: "Enter a valid mobile number, including +27 for South Africa." };
  }

  const result = await sendTwilioTestSms(phone);
  if (!result.success) {
    return {
      success: false,
      message: result.error ?? "Twilio could not submit the test SMS.",
      sid: result.sid,
    };
  }

  return {
    success: true,
    message: "Twilio accepted the test SMS request. Check the recipient's phone and the message status in Twilio Console; acceptance does not guarantee delivery.",
    sid: result.sid,
  };
}
