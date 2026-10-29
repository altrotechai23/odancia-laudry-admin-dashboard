"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, FileJson, FileUp, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import { importBookServices, type BookImportResult } from "@/actions/services/import-book-services";

type JsonObject = Record<string, unknown>;

function objectRecords(value: unknown): JsonObject[] | null {
  let rows: unknown[] | null = null;
  if (Array.isArray(value)) rows = value;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const services = (value as Record<string, unknown>).services;
    if (Array.isArray(services)) rows = services;
  }
  if (!rows || !rows.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) return null;
  return rows as JsonObject[];
}

function keyOf(key: string) { return key.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function field(record: JsonObject, aliases: string[]) {
  const keys = new Set(aliases.map(keyOf));
  const entry = Object.entries(record).find(([key, value]) => keys.has(keyOf(key)) && value !== null && value !== undefined && value !== "");
  return entry?.[1];
}
function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function collectionValue(record: JsonObject, kind: "date" | "time") {
  const explicitDate = field(record, ["collection_date", "collectionDate", "collection_due_date", "due_date", "expected_collection_date", "collect_date"]);
  const explicitTime = field(record, ["collection_time", "collectionTime", "pickup_time", "due_time", "collection_clock_time"]);
  const combined = field(record, ["collection_at", "collection_datetime", "pickup_at", "collection_datetime_local"]);
  const source = kind === "date" ? (explicitDate ?? combined) : (explicitTime ?? combined ?? explicitDate);
  if (source === null || source === undefined || source === "") return "—";
  if (kind === "time") {
    const match = String(source).match(/[T ](\d{1,2}:\d{2})(?::\d{2})?/);
    return display(explicitTime ?? match?.[1] ?? (String(source).match(/^\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?$/i) ? source : "—"));
  }
  const match = String(source).match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4})/);
  return display(match?.[1] ?? source);
}

function customer(record: JsonObject) {
  const value = field(record, ["client_name", "customer_name", "full_name", "name"]);
  if (value) return display(value);
  const nested = field(record, ["client", "customer", "clients"]);
  if (typeof nested === "string") return nested;
  if (typeof nested === "object" && nested !== null) {
    const item = Array.isArray(nested) ? nested[0] : nested;
    if (typeof item === "object" && item !== null) return display(field(item as JsonObject, ["name", "full_name", "client_name"]));
  }
  return field(record, ["client_id", "customer_id"]) ? "Existing client (linked ID)" : "Name missing";
}

export default function BookServiceImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawJson, setRawJson] = useState("");
  const [fileName, setFileName] = useState("");
  const [records, setRecords] = useState<JsonObject[]>([]);
  const [fileError, setFileError] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<BookImportResult | null>(null);

  const previewRows = useMemo(() => records.slice(0, 6), [records]);

  async function handleFile(file?: File) {
    if (!file) return;
    // Reset the input value after capturing the File so the same attachment can be selected again.
    if (fileRef.current) fileRef.current.value = "";
    setFileError("");
    setResult(null);
    setRecords([]);
    setRawJson("");
    // On iPad/iOS, the Files picker may report an empty or generic MIME type.
    // Read the selected file and validate its JSON contents instead of relying on MIME alone.
    if (file.type && !["application/json", "text/json", "text/plain", "application/octet-stream", ""].includes(file.type)
      && !file.name.toLowerCase().endsWith(".json")) {
      setFileError("Please choose a JSON file exported from your book.");
      return;
    }
    if (file.size > 800_000) {
      setFileError("This file is larger than 800 KB. Split it into smaller JSON files before importing.");
      return;
    }
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const rows = objectRecords(parsed);
      if (!rows) throw new Error("Expected a JSON array of service objects or an object containing a services array.");
      if (rows.length === 0) throw new Error("No service objects were found in this file.");
      if (rows.length > 500) throw new Error("Please split the file into batches of 500 services or fewer.");
      setRawJson(JSON.stringify(rows));
      setRecords(rows);
      setFileName(file.name);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Unable to read this JSON file.");
      setFileName(file.name);
    }
  }

  async function runImport() {
    if (!rawJson || records.length === 0 || isImporting) return;
    if (!/^\d{4}$/.test(adminCode)) {
      setFileError("Enter the four-digit admin passcode to authorize this import.");
      return;
    }
    setIsImporting(true);
    setFileError("");
    try {
      const importResult = await importBookServices(rawJson, adminCode);
      setResult(importResult);
      setAdminCode("");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Import failed. No success was reported.");
    } finally {
      setIsImporting(false);
    }
  }

  function reset() {
    setRawJson(""); setRecords([]); setFileName(""); setFileError(""); setResult(null); setAdminCode("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><UploadCloud className="h-5 w-5" /></div>
          <div><h2 className="text-base font-bold text-blue-950">Upload a services JSON file</h2><p className="mt-1 text-sm leading-6 text-slate-500">Review a sample of the data before importing. Up to 500 services and 800 KB per file.</p></div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <input id="book-import-json-file" ref={fileRef} type="file" accept=".json,.txt,application/json,text/json,text/plain" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0])} />
        <label htmlFor="book-import-json-file" role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileRef.current?.click(); } }} className="flex min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-5 py-7 text-center transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20">
          <FileUp className="h-8 w-8 text-blue-800" />
          <span className="mt-3 text-sm font-bold text-blue-950">{fileName || "Choose JSON file"}</span>
          <span className="mt-1 text-xs text-slate-500">Tap to browse files on this device</span>
        </label>

        {fileError && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{fileError}</div>}

        {records.length > 0 && !result && (
          <div className="mt-5 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div><p className="text-sm font-bold text-slate-900">Import preview</p><p className="mt-1 text-xs text-slate-500">{records.length} service objects detected. This does not save anything yet.</p></div>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800"><FileJson className="mr-1.5 inline h-3.5 w-3.5" />JSON ready</span>
            </div>
            <div className="divide-y divide-slate-100">
              {previewRows.map((record, index) => (
                <div key={`${index}-${display(field(record, ["service_number", "service_no", "id"]))}`} className="grid gap-2 p-4 sm:grid-cols-[1.2fr_1fr_0.8fr] sm:items-center">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{customer(record)}</p><p className="mt-0.5 truncate text-xs text-slate-500">{display(field(record, ["service_number", "service_no", "order_number"]) ?? `JSON row ${index + 1}`)}</p></div>
                  <div><p className="text-xs font-medium text-slate-600">{display(field(record, ["service_type_name", "service_type", "type_of_service", "type"]))}</p><p className="mt-0.5 text-xs text-slate-500">Total: {display(field(record, ["total_price", "total", "price", "service_price", "amount"]))}</p></div>
                  <div className="rounded-xl border border-red-100 bg-red-50/60 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Collection</p><p className="mt-1 text-xs font-semibold text-blue-950">{collectionValue(record, "date")}</p><p className="text-xs font-medium text-red-700">{collectionValue(record, "time")}</p></div>
                </div>
              ))}
            </div>
            {records.length > previewRows.length && <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing first {previewRows.length} rows only.</p>}
            <div className="border-t border-slate-100 bg-white p-4">
              <label htmlFor="book-import-admin-code" className="mb-2 block text-xs font-bold text-slate-700">Admin passcode <span className="text-red-600">*</span></label>
              <input id="book-import-admin-code" type="password" autoComplete="off" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={adminCode} onChange={(event) => setAdminCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Enter 0000" className="h-12 w-full max-w-xs rounded-xl border border-slate-200 px-4 text-center text-lg font-bold tracking-[0.5em] text-blue-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
              <p className="mt-1.5 text-xs leading-5 text-slate-500">This import is an admin-only write operation. Use 0000; the imported services and payment records will be attributed to the currently logged-in admin.</p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={reset} disabled={isImporting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Choose another file</button>
              <button type="button" onClick={() => void runImport()} disabled={isImporting || !rawJson || !/^\d{4}$/.test(adminCode)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">{isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{isImporting ? "Importing services…" : `Import ${records.length} services`}</button>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-5 rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className={`flex items-start gap-3 rounded-xl p-4 ${result.success ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}>
              {result.success ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />}
              <div><p className="text-sm font-bold">{result.success ? "Import completed" : "Import completed with notes"}</p><p className="mt-1 text-sm leading-6">{result.message}</p></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-800">Imported</p><p className="mt-1 text-xl font-bold text-emerald-950">{result.imported}</p></div>
              <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-blue-800">Duplicates skipped</p><p className="mt-1 text-xl font-bold text-blue-950">{result.skipped}</p></div>
              <div className="rounded-xl bg-cyan-50 p-3"><p className="text-xs text-cyan-800">Schedules completed</p><p className="mt-1 text-xl font-bold text-cyan-950">{result.scheduleUpdated}</p></div>
              <div className="rounded-xl bg-red-50 p-3"><p className="text-xs text-red-800">Failed rows</p><p className="mt-1 text-xl font-bold text-red-950">{result.failed.length}</p></div>
            </div>
            {result.failed.length > 0 && <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-red-100"><div className="border-b border-red-100 bg-red-50 p-3 text-xs font-bold text-red-900">Rows to review</div><div className="divide-y divide-slate-100">{result.failed.map((failure) => <div key={`${failure.row}-${failure.service}`} className="p-3"><p className="text-xs font-bold text-slate-900">Row {failure.row} · {failure.service}</p><p className="mt-1 text-xs leading-5 text-red-700">{failure.message}</p></div>)}</div></div>}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={reset} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Import another file</button><Link href="/dashboard/services" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-800 px-4 text-sm font-bold text-white">View services</Link></div>
          </div>
        )}
      </div>
    </section>
  );
}
