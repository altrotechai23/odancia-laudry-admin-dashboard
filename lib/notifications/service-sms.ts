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
  numberOfItems?: number | null;
  fulfillmentMethod: "customer_pickup" | "delivery";
  totalPrice: number;
  amountPaid: number;
  balance: number;
};

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
 * Keep this false while testing the Twilio trial account.
 *
 * When the account is upgraded and custom SMS is enabled:
 *
 * TWILIO_TRIAL_MODE=false
 */

const trialMode =
  process.env.TWILIO_TRIAL_MODE === "true";

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

function normalizeSouthAfricanPhone(
  phone: string,
): string | null {
  const cleaned =
    phone
      .trim()
      .replace(/[^\d+]/g, "");

  if (!cleaned) {
    return null;
  }

  /*
   * Already international.
   */

  if (cleaned.startsWith("+27")) {
    const digits =
      cleaned.slice(1);

    if (
      digits.length === 11 &&
      digits.startsWith("27")
    ) {
      return `+${digits}`;
    }

    return null;
  }

  /*
   * South African local format:
   *
   * 0712345678
   */

  if (
    cleaned.length === 10 &&
    cleaned.startsWith("0")
  ) {
    return `+27${cleaned.slice(1)}`;
  }

  /*
   * Sometimes users enter:
   *
   * 27123456789
   */

  if (
    cleaned.length === 11 &&
    cleaned.startsWith("27")
  ) {
    return `+${cleaned}`;
  }

  return null;
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
    normalizeSouthAfricanPhone(phone);

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

  /*
   * ----------------------------------------------------------
   * MESSAGE BODY
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Trial accounts can only send Twilio's predefined
   * trial templates.
   *
   * Once the account is upgraded, set:
   *
   * TWILIO_TRIAL_MODE=false
   *
   * and the actual Odancia Laundry message will be sent.
   */

   //   const messageBody = trialMode    ? "sms_appointment_reminders"     : body;
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
  numberOfItems,
  fulfillmentMethod,
  totalPrice,
  amountPaid,
  balance,
}: NewServiceSmsParams): Promise<SmsResult> {
  const reference =
    serviceReference(
      serviceId,
    );

  const fulfillment =
    fulfillmentMethod ===
    "delivery"
      ? "Delivery"
      : "Customer collection";

  const itemLine =
    numberOfItems
      ? `${numberOfItems} item${
          numberOfItems === 1
            ? ""
            : "s"
        }`
      : null;

  const body = [
    `ODANCIA LAUNDRY`,
    ``,
    `Hi ${customerName},`,
    ``,
    `Your laundry service has been successfully booked.`,
    ``,
    `SERVICE`,
    `${serviceName}`,
    serviceDescription
      ? serviceDescription
      : null,
    ``,
    `REF ${reference}`,
    `Received: ${formatDate(serviceDate)}`,
    `Collection: ${formatDate(collectionDate)}`,
    itemLine,
    `Method: ${fulfillment}`,
    ``,
    `TOTAL ${formatMoney(totalPrice)}`,
    `PAID ${formatMoney(amountPaid)}`,
    `BALANCE ${formatMoney(balance)}`,
    ``,
    `Thank you for choosing Odancia Laundry.`,
  ]
    .filter(
      (
        value,
      ): value is string =>
        value !== null,
    )
    .join("\n");

  return sendSms({
    phone,
    body,
  });
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
  numberOfItems,
  fulfillmentMethod,
  totalPrice,
  amountPaid,
  balance,
}: ReadyForCollectionSmsParams): Promise<SmsResult> {
  const reference =
    serviceReference(
      serviceId,
    );

  const fulfillment =
    fulfillmentMethod ===
    "delivery"
      ? "Delivery"
      : "Customer collection";

  const itemLine =
    numberOfItems
      ? `${numberOfItems} item${
          numberOfItems === 1
            ? ""
            : "s"
        }`
      : null;

  const body = [
    `ODANCIA LAUNDRY`,
    ``,
    `READY FOR COLLECTION`,
    ``,
    `Hi ${customerName},`,
    ``,
    `Your laundry is ready.`,
    ``,
    `SERVICE`,
    `${serviceName}`,
    serviceDescription
      ? serviceDescription
      : null,
    ``,
    `REF ${reference}`,
    `Collection: ${formatDate(collectionDate)}`,
    itemLine,
    `Method: ${fulfillment}`,
    ``,
    `TOTAL ${formatMoney(totalPrice)}`,
    `PAID ${formatMoney(amountPaid)}`,
    `BALANCE ${formatMoney(balance)}`,
    ``,
    balance > 0
      ? `Please settle the outstanding balance when collecting.`
      : `Your service has been fully paid.`,
    ``,
    `Thank you for choosing Odancia Laundry.`,
  ]
    .filter(
      (
        value,
      ): value is string =>
        value !== null,
    )
    .join("\n");

  return sendSms({
    phone,
    body,
  });
}