import twilio from "twilio";

/* ============================================================
   TYPES
============================================================ */

type SmsResult = {
  success: boolean;
  skipped: boolean;
  sid: string | null;
  error: string | null;
};

type NewServiceSmsParams = {
  customerName: string;
  phone: string;
  serviceName: string;
  serviceDescription?: string | null;
  serviceId: string;
  serviceDate: string;
  collectionDate: string;
  collectionTime?: string | null;
  numberOfItems?: number | null;
  fulfillmentMethod: "customer_pickup" | "delivery";
  totalPrice: number;
  amountPaid: number;
  balance: number;
};

type ReadyForCollectionSmsParams = {
  customerName: string;
  phone: string;
  serviceName: string;
  serviceDescription?: string | null;
  serviceId: string;
  collectionDate: string;
  collectionTime?: string | null;
  numberOfItems?: number | null;
  fulfillmentMethod: "customer_pickup" | "delivery";
  totalPrice: number;
  amountPaid: number;
  balance: number;
};

/** Format the database clock-time value for customer-facing SMS messages. */
function formatSmsClockTime(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return value;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/* ============================================================
   ENVIRONMENT
============================================================ */

const accountSid =
  process.env.TWILIO_ACCOUNT_SID?.trim();

const authToken =
  process.env.TWILIO_AUTH_TOKEN?.trim();

const from =
  process.env.TWILIO_PHONE_NUMBER?.trim();

/*
 * Optional diagnostic flag for log entries only. It does not change the
 * message body. Twilio trial accounts can have recipient-verification and
 * destination restrictions; check the Twilio Console for the current account.
 */
const trialMode = process.env.TWILIO_TRIAL_MODE === "true";

// Optional operator-configurable messages. If unset, the branded defaults
// below are used. The template editor intentionally stays in .env.local so
// this simple SMS fallback requires no database migration or new dependency.
const newServiceTemplate = process.env.TWILIO_NEW_SERVICE_SMS_TEMPLATE?.trim();
const readyForCollectionTemplate = process.env.TWILIO_READY_FOR_COLLECTION_SMS_TEMPLATE?.trim();

/* ============================================================
   TWILIO CLIENT
============================================================ */

let twilioClient:
  | ReturnType<typeof twilio>
  | null = null;

function getTwilioClient() {
  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials are missing.",
    );
  }

  if (!twilioClient) {
    twilioClient = twilio(
      accountSid,
      authToken,
    );
  }

  return twilioClient;
}

/* ============================================================
   PHONE NORMALIZATION
============================================================ */

function normalizePhoneNumber(phone: string): string | null {
  // Twilio expects E.164. Accept international numbers entered with +country
  // code, international 00 prefix, or South African domestic format.
  const compact = phone.trim().replace(/[\s().-]/g, "");
  if (!compact || !/^\+?\d+$/.test(compact)) return null;

  let international = compact;
  if (international.startsWith("00")) {
    international = `+${international.slice(2)}`;
  }

  if (international.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(international)
      ? international
      : null;
  }

  const digits = international.replace(/\D/g, "");
  // South African local format: 0712345678 -> +27712345678.
  if (/^0\d{9}$/.test(digits)) {
    return `+27${digits.slice(1)}`;
  }
  // South African country code without plus: 27712345678 -> +27712345678.
  if (/^27\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  // For other countries, require callers to include + or 00 so the country
  // code is never guessed incorrectly.
  return null;
}

/** Replace {{placeholder}} values in an optional environment-defined SMS. */
function renderCustomSmsTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template
    .replace(/\\n/g, "\n")
    .replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g, (_match, key: string) => values[key] ?? "")
    .trim();
}

/* ============================================================
   DATE FORMAT
============================================================ */

function formatDate(
  value: string,
): string {
  if (!value) {
    return "TBC";
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

/* ============================================================
   CURRENCY
============================================================ */

function formatMoney(
  amount: number,
): string {
  return `R${amount.toFixed(2)}`;
}

/* ============================================================
   SERVICE REFERENCE
============================================================ */

function serviceReference(
  serviceId: string,
): string {
  return serviceId
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();
}

/* ============================================================
   BASE VALIDATION
============================================================ */

function isTwilioConfigured() {
  return Boolean(
    accountSid &&
      authToken &&
      from,
  );
}

/* ============================================================
   SEND SMS
============================================================ */

/* ============================================================
   SEND SMS
============================================================ */

async function sendSms({
  phone,
  body,
}: {
  phone: string;
  body: string;
}): Promise<SmsResult> {
  /*
   * ----------------------------------------------------------
   * TWILIO CONFIGURATION CHECK
   * ----------------------------------------------------------
   */

  if (!isTwilioConfigured()) {
    console.warn(
      "Twilio SMS skipped: Twilio is not configured.",
    );

    return {
      success: false,
      skipped: true,
      sid: null,
      error: "Twilio is not configured.",
    };
  }

  /*
   * ----------------------------------------------------------
   * PHONE VALIDATION
   * ----------------------------------------------------------
   */

  const to =
    normalizePhoneNumber(phone);

  if (!to) {
    console.warn(
      "Twilio SMS skipped: invalid phone number.",
      phone,
    );

    return {
      success: false,
      skipped: true,
      sid: null,
      error: "Invalid phone number.",
    };
  }

  // This is an ordinary Twilio SMS body (not a Meta/WhatsApp template).
  // Twilio trial accounts may only deliver to verified recipients and may have
  // other destination restrictions; those restrictions are enforced by Twilio.
  const messageBody = body;

  /*
   * ----------------------------------------------------------
   * SEND
   * ----------------------------------------------------------
   */

  try {
    const client =
      getTwilioClient();

    const message =
      await client.messages.create({
        from,
        to,
        body: messageBody,
      });

    console.info(
      "TWILIO SMS SENT:",
      {
        sid: message.sid,
        to,
        trialMode,
      },
    );

    return {
      success: true,
      skipped: false,
      sid: message.sid,
      error: null,
    };
  } catch (error) {
    console.error(
      "TWILIO SMS SEND FAILED:",
      error,
    );

    return {
      success: false,
      skipped: false,
      sid: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to send SMS.",
    };
  }
}

/* ============================================================
   NEW SERVICE SMS
============================================================ */

export async function sendNewServiceSms({
  customerName,
  phone,
  serviceName,
  serviceDescription,
  serviceId,
  serviceDate,
  collectionDate,
  collectionTime,
  numberOfItems,
  fulfillmentMethod,
  totalPrice,
  amountPaid,
  balance,
}: NewServiceSmsParams): Promise<SmsResult> {
  const reference = serviceReference(serviceId);
  const fulfillment = fulfillmentMethod === "delivery" ? "Delivery" : "Customer collection";
  const itemLine = numberOfItems
    ? `${numberOfItems} item${numberOfItems === 1 ? "" : "s"}`
    : "Not specified";
  const formattedCollectionDate = formatDate(collectionDate);
  const formattedCollectionTime = collectionTime ? formatSmsClockTime(collectionTime) : "Not recorded";

  const defaultBody = [
    "ODANCIA LAUNDRY",
    "",
    `Hi ${customerName},`,
    "",
    "Your laundry service has been successfully booked.",
    "",
    "SERVICE",
    serviceName || "Laundry Service",
    serviceDescription || null,
    "",
    `REF ${reference}`,
    `Received: ${formatDate(serviceDate)}`,
    `Collection: ${formattedCollectionDate}${collectionTime ? ` at ${formattedCollectionTime}` : " (time not recorded)"}`,
    itemLine !== "Not specified" ? itemLine : null,
    `Method: ${fulfillment}`,
    "",
    `TOTAL ${formatMoney(totalPrice)}`,
    `PAID ${formatMoney(amountPaid)}`,
    `BALANCE ${formatMoney(balance)}`,
    "",
    "Thank you for choosing Odancia Laundry.",
  ].filter((value): value is string => value !== null).join("\n");

  const body = newServiceTemplate
    ? renderCustomSmsTemplate(newServiceTemplate, {
        businessName: "Odancia Laundry",
        customerName,
        serviceName: serviceName || "Laundry Service",
        serviceDescription: serviceDescription || "",
        serviceReference: reference,
        serviceDate: formatDate(serviceDate),
        collectionDate: formattedCollectionDate,
        collectionTime: formattedCollectionTime,
        numberOfItems: itemLine,
        fulfillmentMethod: fulfillment,
        totalPrice: formatMoney(totalPrice),
        amountPaid: formatMoney(amountPaid),
        balance: formatMoney(balance),
        balanceMessage: balance > 0 ? "An outstanding balance remains." : "Paid in full.",
      })
    : defaultBody;

  return sendSms({ phone, body });
}

/* ============================================================
   READY FOR COLLECTION SMS
============================================================ */

export async function sendReadyForCollectionSms({
  customerName,
  phone,
  serviceName,
  serviceDescription,
  serviceId,
  collectionDate,
  collectionTime,
  numberOfItems,
  fulfillmentMethod,
  totalPrice,
  amountPaid,
  balance,
}: ReadyForCollectionSmsParams): Promise<SmsResult> {
  const reference = serviceReference(serviceId);
  const fulfillment = fulfillmentMethod === "delivery" ? "Delivery" : "Customer collection";
  const itemLine = numberOfItems
    ? `${numberOfItems} item${numberOfItems === 1 ? "" : "s"}`
    : "Not specified";
  const formattedCollectionDate = formatDate(collectionDate);
  const formattedCollectionTime = collectionTime ? formatSmsClockTime(collectionTime) : "Not recorded";
  const balanceMessage = balance > 0
    ? "Please settle the outstanding balance when collecting."
    : "Your service has been fully paid.";

  const defaultBody = [
    "ODANCIA LAUNDRY",
    "",
    "READY FOR COLLECTION",
    "",
    `Hi ${customerName},`,
    "",
    "Your laundry is ready.",
    "",
    "SERVICE",
    serviceName || "Laundry Service",
    serviceDescription || null,
    "",
    `REF ${reference}`,
    `Collection: ${formattedCollectionDate}${collectionTime ? ` at ${formattedCollectionTime}` : " (time not recorded)"}`,
    itemLine !== "Not specified" ? itemLine : null,
    `Method: ${fulfillment}`,
    "",
    `TOTAL ${formatMoney(totalPrice)}`,
    `PAID ${formatMoney(amountPaid)}`,
    `BALANCE ${formatMoney(balance)}`,
    "",
    balanceMessage,
    "",
    "Thank you for choosing Odancia Laundry.",
  ].filter((value): value is string => value !== null).join("\n");

  const body = readyForCollectionTemplate
    ? renderCustomSmsTemplate(readyForCollectionTemplate, {
        businessName: "Odancia Laundry",
        customerName,
        serviceName: serviceName || "Laundry Service",
        serviceDescription: serviceDescription || "",
        serviceReference: reference,
        collectionDate: formattedCollectionDate,
        collectionTime: formattedCollectionTime,
        numberOfItems: itemLine,
        fulfillmentMethod: fulfillment,
        totalPrice: formatMoney(totalPrice),
        amountPaid: formatMoney(amountPaid),
        balance: formatMoney(balance),
        balanceMessage,
      })
    : defaultBody;

  return sendSms({ phone, body });
}
