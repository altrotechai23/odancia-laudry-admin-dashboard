"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeStaffWrite, clearStaffWriteAuthorization } from "@/lib/staff/security";

type JsonObject = Record<string, unknown>;
type ImportPayment = {
  amount: number;
  payment_method: "cash" | "eft" | "card" | "other";
  payment_stage: string;
  reference: string | null;
  notes: string | null;
};
type PreparedService = {
  index: number;
  sourceKey: string;
  serviceNumber: string | null;
  existingClientId: string | null;
  clientName: string;
  phone: string;
  email: string | null;
  serviceTypeName: string | null;
  serviceTypeId: string | null;
  serviceDate: string;
  serviceTime: string | null;
  collectionDate: string | null;
  collectionTime: string | null;
  totalPrice: number;
  basePrice: number;
  isExpress: boolean;
  status: "pending" | "ready_for_collection" | "collected";
  fulfillment: "customer_pickup" | "delivery";
  numberOfItems: number | null;
  notes: string | null;
  payments: ImportPayment[];
};

export type BookImportFailure = { row: number; service: string; message: string };
export type BookImportResult = {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  scheduleUpdated: number;
  failed: BookImportFailure[];
};

const MAX_JSON_CHARS = 800_000;
const MAX_RECORDS = 500;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keyName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function valueOf(record: JsonObject, aliases: string[]): unknown {
  const wanted = new Set(aliases.map(keyName));
  for (const [key, value] of Object.entries(record)) {
    if (wanted.has(keyName(key)) && value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function asObject(value: unknown): JsonObject | null {
  return isObject(value) ? value : null;
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asString(record: JsonObject, aliases: string[]): string {
  return textValue(valueOf(record, aliases));
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const text = textValue(value).toLowerCase();
  return ["true", "yes", "y", "1", "express", "urgent"].includes(text);
}

function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
  if (typeof value !== "string") return null;
  let text = value.trim().replace(/\bZAR\b/gi, "").replace(/[R\s\u00a0]/gi, "");
  if (!text) return null;
  if (text.includes(",") && text.includes(".")) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (text.includes(",")) {
    text = text.replace(/,/g, ".");
  }
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : null;
}

function normaliseDate(value: unknown): string | null {
  const text = textValue(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let year: number;
  let month: number;
  let day: number;
  if (iso) {
    year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]);
  } else {
    const local = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})(?:[ T].*)?$/);
    if (!local) return null;
    // Book dates are interpreted in South African day/month/year order.
    day = Number(local[1]); month = Number(local[2]); year = Number(local[3]);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function localToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function normaliseTime(value: unknown): string | null {
  const text = textValue(value);
  if (!text) return null;

  const format = (hourInput: string, minuteInput: string, suffixInput?: string): string | null => {
    let hour = Number(hourInput);
    const minute = Number(minuteInput);
    const suffix = suffixInput?.toUpperCase();
    if (suffix) {
      if (hour < 1 || hour > 12) return null;
      if (suffix === "AM" && hour === 12) hour = 0;
      if (suffix === "PM" && hour !== 12) hour += 12;
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  };

  // First accept common date-time strings such as 2026-10-29T15:30:00+02:00.
  const dateTime = text.match(/[T ](\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (dateTime) return format(dateTime[1], dateTime[2], dateTime[3]);

  const standard = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (standard) return format(standard[1], standard[2], standard[3]);

  const hourOnly = text.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (hourOnly) return format(hourOnly[1], "00", hourOnly[2]);
  return null;
}

function normalisePaymentMethod(value: unknown): ImportPayment["payment_method"] {
  const method = textValue(value).toLowerCase();
  if (method.includes("cash")) return "cash";
  if (method.includes("eft") || method.includes("bank") || method.includes("transfer") || method.includes("online")) return "eft";
  if (method.includes("card") || method.includes("pos")) return "card";
  return "other";
}

function normaliseStatus(value: unknown): PreparedService["status"] {
  const status = textValue(value).toLowerCase().replace(/[_-]+/g, " ").trim();
  if (["collected", "complete", "completed", "picked up", "delivered"].includes(status)) return "collected";
  if (["ready", "ready for collection", "ready for pickup", "ready for delivery"].includes(status)) return "ready_for_collection";
  return "pending";
}

function normaliseFulfillment(value: unknown): PreparedService["fulfillment"] {
  const method = textValue(value).toLowerCase();
  return method.includes("deliver") ? "delivery" : "customer_pickup";
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sourceKeyFor(record: JsonObject, index: number): string {
  const externalId = textValue(valueOf(record, [
    "source_id", "book_id", "external_id", "record_id", "service_number", "order_number", "receipt_number", "reference", "id",
  ]));
  // Book exports often get enriched after the first import (for example, the
  // collection date/time is added later). Exclude schedule/payment fields from
  // the fallback fingerprint so a re-import can backfill a missing schedule
  // instead of accidentally creating a duplicate service. The row index keeps
  // otherwise identical same-day services distinct when the book has no ID.
  const mutableFields = new Set([
    "collectiondate", "collectionduedate", "duedate", "expectedcollectiondate", "collectdate",
    "collectiontime", "pickuptime", "duetime", "collectionclocktime", "collectionat",
    "collectiondatetime", "pickupat", "collectiondatetimelocal", "payments", "paymenthistory",
    "transactions", "deposit", "depositamount", "downpayment", "amountpaid", "paidamount",
    "totalpaid", "paid", "amountreceived",
  ]);
  const stableRecord = Object.fromEntries(
    Object.entries(record).filter(([key]) => !mutableFields.has(keyName(key))),
  );
  const input = externalId
    ? `book-reference:${externalId.toLowerCase()}`
    : `book-row:${index}:${canonicalJson(stableRecord)}`;
  return createHash("sha256").update(input).digest("hex");
}

function buildPayments(record: JsonObject, totalPrice: number): { payments: ImportPayment[]; error: string | null } {
  const paymentsValue = valueOf(record, ["payments", "payment_history", "transactions"]);
  const paymentsArray = Array.isArray(paymentsValue) ? paymentsValue : [];
  const result: ImportPayment[] = [];

  if (paymentsArray.length > 0) {
    for (let i = 0; i < paymentsArray.length; i += 1) {
      const payment = asObject(paymentsArray[i]);
      if (!payment) return { payments: [], error: `Payment ${i + 1} must be an object.` };
      const amountValue = valueOf(payment, ["amount", "amount_paid", "value", "received", "payment_amount"]);
      const amount = parseMoney(amountValue);
      if (amount === null) return { payments: [], error: `Payment ${i + 1} needs a valid non-negative amount.` };
      if (amount === 0) continue;
      const stageText = asString(payment, ["payment_stage", "stage", "payment_type"]).toLowerCase();
      result.push({
        amount,
        payment_method: normalisePaymentMethod(valueOf(payment, ["payment_method", "method", "type"])),
        payment_stage: stageText.includes("deposit") ? "deposit" : stageText.includes("final") ? "final" : "partial",
        reference: asString(payment, ["reference", "transaction_reference", "receipt"]) || null,
        notes: asString(payment, ["notes", "description", "comment"]) || "Imported from service book",
      });
    }
    return { payments: result, error: null };
  }

  const depositRaw = valueOf(record, ["deposit_amount", "deposit", "down_payment", "downpayment"]);
  const depositParsed = depositRaw === undefined ? 0 : parseMoney(depositRaw);
  if (depositParsed === null) return { payments: [], error: "Deposit amount is not a valid non-negative number." };
  const deposit = depositParsed;
  const amountPaidValue = valueOf(record, ["amount_paid", "paid_amount", "total_paid", "paid", "amount_received"]);
  const amountPaid = amountPaidValue === undefined ? null : parseMoney(amountPaidValue);
  if (amountPaidValue !== undefined && amountPaid === null) return { payments: [], error: "Amount paid is not a valid non-negative number." };
  const paid = amountPaid !== null && amountPaid > 0 ? amountPaid : deposit;
  if (paid <= 0) return { payments: [], error: null };
  const method = normalisePaymentMethod(valueOf(record, ["payment_method", "payment_type", "method"]));
  const reference = asString(record, ["reference", "payment_reference", "receipt_number"]) || null;
  const notes = asString(record, ["payment_notes", "payment_description"]) || "Imported from service book";

  if (deposit > 0 && paid > deposit) {
    result.push({ amount: deposit, payment_method: method, payment_stage: "deposit", reference, notes: `${notes} (deposit)` });
    result.push({ amount: Math.round((paid - deposit) * 100) / 100, payment_method: method, payment_stage: paid >= totalPrice ? "final" : "partial", reference, notes: `${notes} (remaining recorded payments)` });
  } else {
    result.push({
      amount: paid,
      payment_method: method,
      payment_stage: deposit > 0 ? "deposit" : paid >= totalPrice ? "final" : "partial",
      reference,
      notes,
    });
  }
  return { payments: result, error: null };
}

function prepareRecord(record: JsonObject, index: number): { data: PreparedService | null; error: string | null; label: string; sourceKey: string } {
  const sourceKey = sourceKeyFor(record, index);
  const clientValue = valueOf(record, ["client", "customer", "client_info", "customer_info", "clients"]);
  const clientContainer = asObject(clientValue) ?? (Array.isArray(clientValue) ? asObject(clientValue[0]) : null) ?? {};
  const clientRaw = valueOf(record, ["client", "customer", "clients"]);
  const clientName = asString(record, ["client_name", "customer_name", "full_name", "clientName", "customerName", "customer_full_name"])
    || asString(clientContainer, ["name", "full_name", "fullName", "client_name", "customer_name"])
    || (typeof clientRaw === "string" ? clientRaw.trim() : "")
    || asString(record, ["name"]);
  const phone = asString(record, ["client_phone", "customer_phone", "phone_number", "phone", "mobile", "contact_number"])
    || asString(clientContainer, ["phone", "mobile", "phone_number", "contact"]);
  const email = asString(record, ["client_email", "customer_email", "email"])
    || asString(clientContainer, ["email", "contact_email"]);
  const serviceNumber = asString(record, ["service_number", "service_no", "order_number", "receipt_number", "ticket_number"]) || null;
  const existingClientCandidate = asString(record, ["client_id", "customer_id"]);
  const existingClientId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existingClientCandidate) ? existingClientCandidate : null;
  const label = serviceNumber || clientName || `row ${index + 1}`;
  if (clientName.length < 2 && !existingClientId) return { data: null, error: "Customer/client name is missing (expected client_name or client.name), and no valid existing client_id was supplied.", label, sourceKey };

  const rawTotal = valueOf(record, ["total_price", "total", "final_price", "service_price", "price", "charge", "amount"]);
  const totalParsed = parseMoney(rawTotal);
  const baseParsed = parseMoney(valueOf(record, ["base_price", "basePrice", "standard_price", "agreed_price"]));
  const isExpress = parseBoolean(valueOf(record, ["is_express", "express", "urgent", "express_service"]));
  if (totalParsed === null && baseParsed === null) return { data: null, error: "A valid total_price or base_price is required.", label, sourceKey };
  const totalPrice = totalParsed ?? (baseParsed ?? 0) * (isExpress ? 2 : 1);
  const basePrice = baseParsed ?? (isExpress ? totalPrice / 2 : totalPrice);
  if (isExpress && Math.round(totalPrice * 100) !== Math.round(basePrice * 200)) {
    return { data: null, error: "Express price must be double base_price. Include both values or correct the source record.", label, sourceKey };
  }

  const serviceDateRaw = valueOf(record, ["service_date", "date_received", "received_date", "date", "created_date", "created_at"]);
  const serviceDate = serviceDateRaw === undefined ? localToday() : normaliseDate(serviceDateRaw);
  if (!serviceDate) return { data: null, error: "Service date is invalid. Use YYYY-MM-DD or DD/MM/YYYY.", label, sourceKey };

  const combinedCollection = valueOf(record, ["collection_at", "collection_datetime", "pickup_at", "collection_datetime_local"]);
  const collectionDateRaw = valueOf(record, ["collection_date", "collectionDate", "collection_due_date", "due_date", "expected_collection_date", "collect_date"])
    ?? (combinedCollection !== undefined ? combinedCollection : undefined);
  const collectionDate = collectionDateRaw === undefined ? null : normaliseDate(collectionDateRaw);
  if (collectionDateRaw !== undefined && !collectionDate) return { data: null, error: "Collection date is invalid. Use YYYY-MM-DD or DD/MM/YYYY.", label, sourceKey };

  const serviceTimeRaw = valueOf(record, ["service_time", "time_received", "received_time", "serviceTime", "time"]);
  const serviceTime = serviceTimeRaw === undefined ? null : normaliseTime(serviceTimeRaw);
  if (serviceTimeRaw !== undefined && !serviceTime) return { data: null, error: "Service time is invalid. Use HH:mm or a value such as 2:30 PM.", label, sourceKey };
  const explicitCollectionTimeRaw = valueOf(record, ["collection_time", "collectionTime", "pickup_time", "due_time", "collection_clock_time"]);
  // Some exports store collection date and time together in collection_at /
  // collection_datetime or even in collection_date. Preserve the time portion.
  const collectionTimeSource = explicitCollectionTimeRaw ?? combinedCollection ?? collectionDateRaw;
  const parsedCollectionTime = collectionTimeSource === undefined ? null : normaliseTime(collectionTimeSource);
  const collectionTime = parsedCollectionTime;
  if (explicitCollectionTimeRaw !== undefined && !collectionTime) return { data: null, error: "Collection time is invalid. Use HH:mm or a value such as 2:30 PM.", label, sourceKey };

  const serviceTypeRaw = valueOf(record, ["service_type_name", "service_type", "serviceType", "service_types", "type_of_service", "laundry_type", "type"]);
  const serviceTypeObject = asObject(serviceTypeRaw) ?? (Array.isArray(serviceTypeRaw) ? asObject(serviceTypeRaw[0]) : null);
  const explicitServiceTypeId = asString(record, ["service_type_id", "serviceTypeId"]) || (serviceTypeObject ? asString(serviceTypeObject, ["id", "service_type_id"]) : "");
  const rawServiceTypeText = serviceTypeObject ? asString(serviceTypeObject, ["name", "title", "label"]) : textValue(serviceTypeRaw);
  const serviceTypeIdCandidate = explicitServiceTypeId || (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawServiceTypeText) ? rawServiceTypeText : "");
  const serviceTypeId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceTypeIdCandidate) ? serviceTypeIdCandidate : null;
  const serviceTypeName = (serviceTypeId && rawServiceTypeText === serviceTypeId ? "" : rawServiceTypeText) || null;
  const paymentResult = buildPayments(record, totalPrice);
  if (paymentResult.error) return { data: null, error: paymentResult.error, label, sourceKey };

  const itemRaw = valueOf(record, ["number_of_items", "item_count", "quantity", "items_count"]);
  const itemCount = itemRaw === undefined ? null : Number(itemRaw);
  if (itemCount !== null && (!Number.isInteger(itemCount) || itemCount < 0)) return { data: null, error: "number_of_items must be a non-negative whole number.", label, sourceKey };

  return {
    sourceKey,
    label,
    error: null,
    data: {
      index, sourceKey, serviceNumber, existingClientId, clientName: clientName || "Existing client", phone, email: email || null, serviceTypeName, serviceTypeId,
      serviceDate, serviceTime, collectionDate, collectionTime, totalPrice: Math.round(totalPrice * 100) / 100,
      basePrice: Math.round(basePrice * 100) / 100, isExpress, status: normaliseStatus(valueOf(record, ["service_status", "status", "stage"])),
      fulfillment: normaliseFulfillment(valueOf(record, ["fulfillment_method", "fulfillment", "delivery_method", "collection_method"])),
      numberOfItems: itemCount, notes: asString(record, ["notes", "remarks", "special_instructions"]) || null, payments: paymentResult.payments,
    },
  };
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function normalisePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function normaliseName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function expressTimestamps(serviceDate: string, serviceTime: string | null) {
  const clock = serviceTime?.slice(0, 8) ?? "09:00:00";
  const start = new Date(`${serviceDate}T${clock}+02:00`);
  if (Number.isNaN(start.getTime())) return { earliest: null, expected: null };
  return { earliest: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(), expected: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString() };
}

export async function importBookServices(rawJson: string, submittedAdminCode: string): Promise<BookImportResult> {
  const emptyResult = (message: string): BookImportResult => ({ success: false, message, imported: 0, skipped: 0, scheduleUpdated: 0, failed: [] });
  const actor = await requireOwnerOrAdmin();

  if (typeof rawJson !== "string" || !rawJson.trim()) return emptyResult("Choose a JSON file first.");
  if (rawJson.length > MAX_JSON_CHARS) return emptyResult("This file is too large for one import. Use a JSON file smaller than 800 KB or split it into smaller files.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return emptyResult("The file is not valid JSON. Fix the JSON syntax and try again.");
  }
  const rawRecords = Array.isArray(parsed) ? parsed : isObject(parsed) && Array.isArray(parsed.services) ? parsed.services : null;
  if (!rawRecords) return emptyResult("Expected a JSON array of service objects, or an object containing a services array.");
  if (rawRecords.length === 0) return emptyResult("The JSON file does not contain any service records.");
  if (rawRecords.length > MAX_RECORDS) return emptyResult(`Import up to ${MAX_RECORDS} services per file. Split this file into smaller batches.`);

  const failed: BookImportFailure[] = [];
  const prepared: PreparedService[] = [];
  for (let index = 0; index < rawRecords.length; index += 1) {
    const raw = rawRecords[index];
    if (!isObject(raw)) {
      failed.push({ row: index + 1, service: `row ${index + 1}`, message: "Each item must be a JSON object." });
      continue;
    }
    const result = prepareRecord(raw, index);
    if (!result.data) {
      failed.push({ row: index + 1, service: result.label, message: result.error ?? "Invalid service data." });
      continue;
    }
    prepared.push(result.data);
  }
  if (prepared.length === 0) return { success: false, message: "No valid service records to import. Check the row errors below.", imported: 0, skipped: 0, scheduleUpdated: 0, failed };

  // Imports are bulk CRUD operations and are restricted to the currently logged-in admin.
  // Do not allow an on-duty staff passcode to invoke the book importer.
  if (String(submittedAdminCode ?? "").trim() !== "0000") {
    return emptyResult("Only the currently logged-in admin can import services. Enter the admin passcode 0000.");
  }
  const authorization = await authorizeStaffWrite(submittedAdminCode);
  if (!authorization.success) return emptyResult(authorization.message);
  if (authorization.actorRole !== "owner" && authorization.actorRole !== "admin") {
    await clearStaffWriteAuthorization(authorization.authorizationId);
    return emptyResult("Only the currently logged-in admin can import services.");
  }

  try {
    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch (error) {
      console.error("BOOK IMPORT ADMIN CLIENT FAILED", error);
      return emptyResult("The server is not configured for secure imports. Check SUPABASE_SERVICE_ROLE_KEY on the server.");
    }

  const sourceKeys = prepared.map((row) => row.sourceKey);
  const existingKeys = new Set<string>();
  const existingByKey = new Map<string, { id: string; collection_date: string | null; collection_time: string | null }>();
  for (const batch of chunks(sourceKeys, 100)) {
    const { data, error } = await admin.from("services")
      .select("id,import_source_key,collection_date,collection_time")
      .in("import_source_key", batch);
    if (error) {
      console.error("BOOK IMPORT DUPLICATE CHECK FAILED", error.message);
      return emptyResult(error.code === "42703"
        ? "The import database migration is not installed. Apply 202610280004_book_import_collection_time.sql, then retry."
        : `Unable to prepare the import: ${error.message}`);
    }
    for (const row of data ?? []) {
      if (!row.import_source_key) continue;
      const key = String(row.import_source_key);
      existingKeys.add(key);
      existingByKey.set(key, { id: row.id, collection_date: row.collection_date, collection_time: row.collection_time });
    }
  }

  const { data: serviceTypes, error: serviceTypesError } = await admin.from("service_types").select("id,name");
  if (serviceTypesError) return emptyResult(`Unable to load service types: ${serviceTypesError.message}`);
  const typeByName = new Map<string, string>((serviceTypes ?? []).map((type) => [normaliseName(type.name), type.id]));

  const uniquePhones = Array.from(new Set(prepared.map((row) => row.phone).filter(Boolean)));
  const namesWithoutPhone = Array.from(new Set(prepared.filter((row) => !row.phone).map((row) => row.clientName)));
  const clientByPhone = new Map<string, string>();
  const clientByName = new Map<string, string>();
  for (const batch of chunks(uniquePhones, 100)) {
    if (batch.length === 0) continue;
    const { data, error } = await admin.from("clients").select("id,full_name,phone").in("phone", batch);
    if (error) return emptyResult(`Unable to look up existing customers: ${error.message}`);
    for (const client of data ?? []) {
      if (client.phone) clientByPhone.set(normalisePhone(client.phone), client.id);
      if (client.full_name) clientByName.set(normaliseName(client.full_name), client.id);
    }
  }
  for (const batch of chunks(namesWithoutPhone, 100)) {
    if (batch.length === 0) continue;
    const { data, error } = await admin.from("clients").select("id,full_name,phone").in("full_name", batch);
    if (error) return emptyResult(`Unable to look up customers without phone numbers: ${error.message}`);
    for (const client of data ?? []) if (client.full_name) clientByName.set(normaliseName(client.full_name), client.id);
  }
  const clientsById = new Map<string, { id: string; full_name: string; phone: string | null }>();
  const linkedClientIds = Array.from(new Set(prepared.map((row) => row.existingClientId).filter((id): id is string => Boolean(id))));
  for (const batch of chunks(linkedClientIds, 100)) {
    if (batch.length === 0) continue;
    const { data, error } = await admin.from("clients").select("id,full_name,phone").in("id", batch);
    if (error) return emptyResult(`Unable to verify existing client IDs: ${error.message}`);
    for (const client of data ?? []) clientsById.set(client.id, client);
  }

  let imported = 0;
  let skipped = 0;
  let scheduleUpdated = 0;
  const auditRows: Array<Record<string, unknown>> = [];

  for (const row of prepared) {
    if (existingKeys.has(row.sourceKey)) {
      const existing = existingByKey.get(row.sourceKey);
      const schedulePatch: Record<string, unknown> = {};
      // Re-imports never overwrite a schedule that already exists. They only
      // backfill missing date/time values when the book supplies them.
      if (existing && !existing.collection_date && row.collectionDate) schedulePatch.collection_date = row.collectionDate;
      if (existing && !existing.collection_time && row.collectionTime) schedulePatch.collection_time = row.collectionTime;
      if (existing && Object.keys(schedulePatch).length > 0) {
        const { error: scheduleError } = await admin.from("services").update({
          ...schedulePatch, updated_by: actor.id, updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        if (scheduleError) {
          failed.push({ row: row.index + 1, service: row.serviceNumber || row.clientName, message: `Existing service was found, but its missing collection schedule could not be filled: ${scheduleError.message}` });
          continue;
        }
        scheduleUpdated += 1;
        existingByKey.set(row.sourceKey, {
          ...existing,
          collection_date: (schedulePatch.collection_date as string | undefined) ?? existing.collection_date,
          collection_time: (schedulePatch.collection_time as string | undefined) ?? existing.collection_time,
        });
        auditRows.push({
          table_name: "services", record_id: existing.id, action: "IMPORT_BACKFILL_COLLECTION_SCHEDULE",
          actor_id: actor.id, actor_name: actor.full_name,
          old_data: { collection_date: existing.collection_date, collection_time: existing.collection_time },
          new_data: schedulePatch,
        });
      }
      skipped += 1;
      continue;
    }
    if (row.serviceTypeId && !(serviceTypes ?? []).some((type) => type.id === row.serviceTypeId) && !row.serviceTypeName) {
      failed.push({ row: row.index + 1, service: row.serviceNumber || row.clientName, message: `The referenced service_type_id ${row.serviceTypeId} does not exist here, and no service type name was supplied to map it.` });
      continue;
    }

    let clientId = row.existingClientId ? clientsById.get(row.existingClientId)?.id : undefined;
    if (row.existingClientId && !clientId) {
      failed.push({ row: row.index + 1, service: row.serviceNumber || row.clientName, message: `The referenced client_id ${row.existingClientId} does not exist in this Supabase project.` });
      continue;
    }
    if (!clientId && row.phone) clientId = clientByPhone.get(normalisePhone(row.phone));
    if (!clientId && !row.phone) clientId = clientByName.get(normaliseName(row.clientName));
    let createdClientId: string | null = null;

    if (!clientId) {
      const { data: client, error } = await admin.from("clients").insert({
        full_name: row.clientName,
        phone: row.phone || "",
        email: row.email,
      }).select("id,full_name,phone").single();
      if (error || !client) {
        failed.push({ row: row.index + 1, service: row.serviceNumber || row.clientName, message: `Customer could not be saved: ${error?.message ?? "unknown database error"}` });
        continue;
      }
      clientId = client.id;
      createdClientId = client.id;
      if (client.phone) clientByPhone.set(normalisePhone(client.phone), client.id);
      clientByName.set(normaliseName(client.full_name), client.id);
    }

    let serviceTypeId: string | null = row.serviceTypeId && (serviceTypes ?? []).some((type) => type.id === row.serviceTypeId) ? row.serviceTypeId : null;
    if (!serviceTypeId && row.serviceTypeName) {
      const typeKey = normaliseName(row.serviceTypeName);
      serviceTypeId = typeByName.get(typeKey) ?? null;
      if (!serviceTypeId) {
        const { data: createdType, error } = await admin.from("service_types").insert({ name: row.serviceTypeName, is_active: true }).select("id,name").single();
        if (error || !createdType) {
          failed.push({ row: row.index + 1, service: row.serviceNumber || row.clientName, message: `Service type could not be saved: ${error?.message ?? "unknown database error"}` });
          if (createdClientId) {
            const { count } = await admin.from("services").select("id", { count: "exact", head: true }).eq("client_id", createdClientId);
            if ((count ?? 0) === 0) await admin.from("clients").delete().eq("id", createdClientId);
          }
          continue;
        }
        serviceTypeId = createdType.id;
        typeByName.set(typeKey, createdType.id);
        auditRows.push({
          table_name: "service_types",
          record_id: createdType.id,
          action: "IMPORT_CREATE_SERVICE_TYPE",
          actor_id: actor.id,
          actor_name: actor.full_name,
          old_data: null,
          new_data: { id: createdType.id, name: createdType.name },
        });
      }
    }

    const express = row.isExpress ? expressTimestamps(row.serviceDate, row.serviceTime) : { earliest: null, expected: null };
    const serviceInsert: Record<string, unknown> = {
      client_id: clientId,
      service_type_id: serviceTypeId,
      service_date: row.serviceDate,
      service_time: row.serviceTime,
      collection_date: row.collectionDate,
      collection_time: row.collectionTime,
      total_price: row.totalPrice,
      base_price: row.basePrice,
      is_express: row.isExpress,
      express_earliest_at: express.earliest,
      expected_completion_at: express.expected,
      deposit_amount: 0,
      amount_paid: 0,
      balance: row.totalPrice,
      payment_status: row.totalPrice === 0 ? "paid" : "unpaid",
      service_status: row.status,
      fulfillment_method: row.fulfillment,
      number_of_items: row.numberOfItems,
      notes: row.notes,
      created_by: actor.id,
      updated_by: actor.id,
      import_source_key: row.sourceKey,
    };
    if (row.serviceNumber) serviceInsert.service_number = row.serviceNumber;

    const { data: service, error: serviceError } = await admin.from("services").insert(serviceInsert).select("id,service_number").single();
    if (serviceError || !service) {
      failed.push({ row: row.index + 1, service: row.serviceNumber || row.clientName, message: `Service could not be saved: ${serviceError?.message ?? "unknown database error"}` });
      if (createdClientId) {
        const { count } = await admin.from("services").select("id", { count: "exact", head: true }).eq("client_id", createdClientId);
        if ((count ?? 0) === 0) await admin.from("clients").delete().eq("id", createdClientId);
      }
      continue;
    }

    if (row.payments.length > 0) {
      const { error: paymentsError } = await admin.from("payments").insert(row.payments.map((payment) => ({
        service_id: service.id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        payment_stage: payment.payment_stage,
        reference: payment.reference,
        notes: payment.notes,
        received_by: actor.id,
      })));
      if (paymentsError) {
        console.error("BOOK IMPORT PAYMENT INSERT FAILED", { serviceId: service.id, message: paymentsError.message });
        const { error: rollbackError } = await admin.from("services").delete().eq("id", service.id);
        if (rollbackError) console.error("BOOK IMPORT SERVICE ROLLBACK FAILED", rollbackError.message);
        failed.push({ row: row.index + 1, service: row.serviceNumber || row.clientName, message: `Payments were not imported (${paymentsError.message}); the service was rolled back where possible.` });
        if (createdClientId) {
          const { count } = await admin.from("services").select("id", { count: "exact", head: true }).eq("client_id", createdClientId);
          if ((count ?? 0) === 0) await admin.from("clients").delete().eq("id", createdClientId);
        }
        continue;
      }
    }

    auditRows.push({
      table_name: "services",
      record_id: service.id,
      action: "IMPORT_FROM_BOOK",
      actor_id: actor.id,
      actor_name: actor.full_name,
      old_data: null,
      new_data: {
        service_number: service.service_number,
        client_id: clientId,
        total_price: row.totalPrice,
        collection_date: row.collectionDate,
        collection_time: row.collectionTime,
        imported_payment_count: row.payments.length,
        import_source_key: row.sourceKey,
      },
    });
    if (row.phone) clientByPhone.set(normalisePhone(row.phone), clientId);
    clientByName.set(normaliseName(row.clientName), clientId);
    existingKeys.add(row.sourceKey);
    existingByKey.set(row.sourceKey, { id: service.id, collection_date: row.collectionDate, collection_time: row.collectionTime });
    imported += 1;
  }

  if (auditRows.length > 0) {
    const { error } = await admin.from("audit_logs").insert(auditRows);
    if (error) console.warn("BOOK IMPORT AUDIT LOGGING WARNING", error.message);
  }

  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/activity");

  const success = failed.length === 0;
  const message = `${imported} service${imported === 1 ? "" : "s"} imported, ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped, ${scheduleUpdated} existing schedule${scheduleUpdated === 1 ? "" : "s"} backfilled, ${failed.length} row${failed.length === 1 ? "" : "s"} need attention.`;
  return { success, message, imported, skipped, scheduleUpdated, failed };
  } finally {
    await clearStaffWriteAuthorization(authorization.authorizationId);
  }
}
