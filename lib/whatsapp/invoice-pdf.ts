import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type InvoicePdfPayment = {
  amount: number;
  payment_method: string | null;
  payment_stage?: string | null;
  paid_at?: string | null;
};

export type InvoicePdfInput = {
  business: {
    business_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
  } | null;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  serviceDescription?: string | null;
  serviceDate: string;
  serviceTime?: string | null;
  collectionDate?: string | null;
  collectionTime?: string | null;
  fulfillmentMethod: string;
  numberOfItems?: number | null;
  notes?: string | null;
  isExpress: boolean;
  basePrice: number;
  totalPrice: number;
  payments: InvoicePdfPayment[];
  paymentStatus: string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const BLUE = [0.04, 0.25, 0.48] as const;
const RED = [0.89, 0.08, 0.18] as const;
const GREY = [0.35, 0.39, 0.44] as const;
const PALE = [0.95, 0.97, 0.99] as const;

function money(value: number): string {
  return `R ${Number(value || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value?: string | null, time?: string | null): string {
  if (!value) return "To be confirmed";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const pretty = match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  return time ? `${pretty} at ${time.slice(0, 5)}` : pretty;
}

function ascii(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfEscape(value: unknown): string {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function textCommand(text: unknown, x: number, y: number, size: number, font = "F1", color: readonly number[] = [0.08, 0.1, 0.14]): string {
  const [r, g, b] = color;
  return `BT /${font} ${size} Tf ${r} ${g} ${b} rg 1 0 0 1 ${x} ${y} Tm (${pdfEscape(text)}) Tj ET`;
}

function rectangle(x: number, y: number, width: number, height: number, color: readonly number[]): string {
  return `q ${color[0]} ${color[1]} ${color[2]} rg ${x} ${y} ${width} ${height} re f Q`;
}

function rule(x1: number, y1: number, x2: number, y2: number, color: readonly number[] = [0.87, 0.9, 0.93], width = 0.7): string {
  return `q ${color[0]} ${color[1]} ${color[2]} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`;
}

function wrap(text: string, maxLength: number): string[] {
  const words = ascii(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= maxLength) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function streamObject(dictionary: string, data: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from(`<< ${dictionary} /Length ${data.length} >>\nstream\n`, "binary"),
    data,
    Buffer.from("\nendstream", "binary"),
  ]);
}

function assemblePdf(objects: Buffer[]): Buffer {
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")];
  const offsets: number[] = [0];
  let position = chunks[0].length;

  objects.forEach((body, index) => {
    offsets.push(position);
    const object = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, "binary"),
      body,
      Buffer.from("\nendobj\n", "binary"),
    ]);
    chunks.push(object);
    position += object.length;
  });

  const xrefPosition = position;
  const xref = [`xref\n0 ${objects.length + 1}\n`, "0000000000 65535 f \n"];
  for (let index = 1; index < offsets.length; index += 1) {
    xref.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  xref.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF\n`);
  chunks.push(Buffer.from(xref.join(""), "binary"));
  return Buffer.concat(chunks);
}

/** Creates a lightweight single-page invoice PDF without a browser or extra runtime dependency. */
export async function createServiceInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const commands: string[] = [];
  let logo: Buffer | null = null;
  try {
    logo = await readFile(join(process.cwd(), "public", "odancia-logo-invoice.jpg"));
  } catch (error) {
    console.warn("ODANCIA INVOICE LOGO NOT FOUND", error instanceof Error ? error.message : "unknown error");
  }

  commands.push(rectangle(0, 812, PAGE_WIDTH, 30, RED));
  commands.push(rectangle(0, 800, PAGE_WIDTH, 12, BLUE));
  if (logo) commands.push("q 154 0 0 56 42 727 cm /Im1 Do Q");
  commands.push(textCommand(input.business?.business_name || "Odancia Laundry", 220, 780, 21, "F2", BLUE));
  commands.push(textCommand("LAUNDRY CARE | SERVICE INVOICE", 221, 759, 8.5, "F2", RED));
  const businessLines = [
    input.business?.phone ? `Tel: ${input.business.phone}` : "",
    input.business?.email || "",
    [input.business?.address, input.business?.city, input.business?.province, input.business?.postal_code].filter(Boolean).join(", "),
  ].filter(Boolean);
  businessLines.slice(0, 3).forEach((line, i) => commands.push(textCommand(line, 221, 742 - i * 13, 8.3, "F1", GREY)));

  commands.push(rule(42, 708, 553, 708, BLUE, 1.1));
  commands.push(textCommand("INVOICE", 42, 675, 24, "F2", BLUE));
  commands.push(textCommand(`Invoice / Service Ref: ${input.invoiceNumber}`, 42, 654, 10, "F2"));
  commands.push(textCommand(`Received: ${dateLabel(input.serviceDate, input.serviceTime)}`, 42, 637, 9.5, "F1", GREY));
  commands.push(textCommand(`Collection: ${dateLabel(input.collectionDate, input.collectionTime)}`, 42, 620, 10, "F2", RED));
  commands.push(textCommand(input.isExpress ? "EXPRESS SERVICE" : "STANDARD SERVICE", 390, 675, 10, "F2", input.isExpress ? RED : BLUE));
  commands.push(textCommand(`Fulfilment: ${input.fulfillmentMethod === "delivery" ? "Delivery" : "Customer collection"}`, 390, 654, 8.5, "F1", GREY));
  commands.push(textCommand(`Status: ${input.paymentStatus.replace(/_/g, " ").toUpperCase()}`, 390, 637, 8.5, "F1", GREY));

  commands.push(rectangle(42, 523, 511, 76, PALE));
  commands.push(textCommand("BILLED TO", 56, 580, 8, "F2", GREY));
  commands.push(textCommand(input.customerName, 56, 561, 12, "F2", BLUE));
  commands.push(textCommand(input.customerPhone, 56, 544, 9.5, "F1", GREY));

  commands.push(rectangle(42, 481, 511, 25, BLUE));
  commands.push(textCommand("SERVICE", 56, 490, 8.5, "F2", [1, 1, 1]));
  commands.push(textCommand("QTY", 340, 490, 8.5, "F2", [1, 1, 1]));
  commands.push(textCommand("PRICE", 442, 490, 8.5, "F2", [1, 1, 1]));
  commands.push(textCommand("TOTAL", 501, 490, 8.5, "F2", [1, 1, 1]));
  commands.push(textCommand(input.serviceName || "Laundry service", 56, 458, 10.5, "F2"));
  let descriptionY = 442;
  if (input.serviceDescription) {
    wrap(input.serviceDescription, 56).slice(0, 2).forEach((line) => {
      commands.push(textCommand(line, 56, descriptionY, 8, "F1", GREY));
      descriptionY -= 11;
    });
  }
  if (input.isExpress) commands.push(textCommand("Express service (double price)", 56, descriptionY - 2, 8, "F2", RED));
  commands.push(textCommand(String(input.numberOfItems ?? 1), 345, 458, 9.5, "F1"));
  commands.push(textCommand(money(input.basePrice), 432, 458, 9, "F1"));
  commands.push(textCommand(money(input.totalPrice), 493, 458, 9, "F2"));
  commands.push(rule(42, 417, 553, 417));

  commands.push(textCommand("PAYMENT SUMMARY", 42, 389, 10, "F2", BLUE));
  commands.push(textCommand("Service total", 42, 366, 9.5, "F1", GREY));
  commands.push(textCommand(money(input.totalPrice), 470, 366, 9.5, "F2"));
  const paid = input.payments.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount) || 0), 0);
  commands.push(textCommand("Amount paid", 42, 346, 9.5, "F1", GREY));
  commands.push(textCommand(money(paid), 470, 346, 9.5, "F2"));
  commands.push(textCommand("Outstanding balance", 42, 326, 10, "F2", RED));
  commands.push(textCommand(money(Math.max(input.totalPrice - paid, 0)), 465, 326, 11, "F2", RED));

  commands.push(rule(42, 305, 553, 305));
  commands.push(textCommand("PAYMENTS RECEIVED", 42, 284, 9.5, "F2", BLUE));
  let paymentY = 264;
  if (input.payments.length === 0) {
    commands.push(textCommand("No payments recorded yet.", 42, paymentY, 9, "F1", GREY));
  } else {
    input.payments.slice(0, 5).forEach((payment) => {
      const method = String(payment.payment_method || "other").replace(/_/g, " ").toUpperCase();
      const stage = payment.payment_stage ? ` - ${String(payment.payment_stage).toUpperCase()}` : "";
      const date = payment.paid_at ? payment.paid_at.slice(0, 10) : "";
      commands.push(textCommand(`${date} ${method}${stage}`, 42, paymentY, 8.5, "F1", GREY));
      commands.push(textCommand(money(Number(payment.amount)), 470, paymentY, 8.5, "F2"));
      paymentY -= 17;
    });
    if (input.payments.length > 5) commands.push(textCommand(`${input.payments.length - 5} additional payment records in account history.`, 42, paymentY, 7.5, "F1", GREY));
  }

  if (input.notes) {
    commands.push(textCommand("NOTES", 42, 176, 8, "F2", BLUE));
    wrap(input.notes, 96).slice(0, 2).forEach((line, index) => commands.push(textCommand(line, 42, 160 - index * 12, 8.5, "F1", GREY)));
  }
  commands.push(rectangle(42, 85, 511, 43, [0.96, 0.97, 0.99]));
  commands.push(textCommand("Thank you for choosing Odancia Laundry.", 56, 109, 10, "F2", BLUE));
  commands.push(textCommand("Please keep this invoice for your records.", 56, 94, 8.5, "F1", GREY));
  commands.push(rectangle(0, 0, PAGE_WIDTH, 7, RED));

  const content = Buffer.from(commands.join("\n"), "ascii");
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "ascii"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 7 0 R >>", "ascii"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "ascii"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>", "ascii"),
  ];

  const logoBytes = logo ?? Buffer.alloc(0);
  if (logoBytes.length > 0) {
    // JPEG assets can be embedded directly using the DCTDecode filter.
    objects.push(streamObject("/Type /XObject /Subtype /Image /Width 1254 /Height 462 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode", logoBytes));
  } else {
    // Keep the document valid even if the optional logo asset is missing.
    objects.push(streamObject("/Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode", Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAFP/aAAgBAgEBPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAFP/aAAgBAwEBPwB//9k=", "base64")));
  }
  objects.push(streamObject("", content));
  return assemblePdf(objects);
}
