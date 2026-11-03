"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { authorizeStaffWrite, clearStaffWriteAuthorization, logStaffServiceOperation } from "@/lib/staff/security";

export async function confirmServiceItemPrices(_previous: { success: boolean; message: string }, formData: FormData) {
  await requireOwnerOrAdmin();
  const serviceId = String(formData.get("serviceId") ?? "");
  if (!serviceId) return { success: false, message: "Service reference is missing." };
  const supabase = await createClient();
  const authorization = await authorizeStaffWrite(formData.get("staff_passcode"));
  if (!authorization.success) return { success: false, message: authorization.message ?? "Staff passcode verification failed." };
  try {
    const { data: service, error: serviceError } = await supabase.from("services").select("id, is_express, total_price, amount_paid").eq("id", serviceId).single();
    if (serviceError || !service) return { success: false, message: "Unable to load this service." };
    const { data: items, error: itemsError } = await supabase.from("service_items").select("id, quantity, unit_price, price_pending").eq("service_id", serviceId);
    if (itemsError || !items?.length) return { success: false, message: "Unable to load service items." };
    const pending = items.filter((item: { price_pending: boolean }) => item.price_pending);
    if (!pending.length) return { success: false, message: "All item prices are already confirmed." };
    const priceUpdates = pending.map((item: { id: string; quantity: number }) => {
      const raw = String(formData.get(`price_${item.id}`) ?? "").trim();
      const price = Number(raw);
      return { id: item.id, quantity: item.quantity, price, valid: raw !== "" && Number.isFinite(price) && price >= 0 };
    });
    if (priceUpdates.some((item) => !item.valid)) return { success: false, message: "Enter a valid price for every pending item." };
    for (const item of priceUpdates) {
      const { error } = await supabase.from("service_items").update({ unit_price: item.price, line_total: item.price * item.quantity * (service.is_express ? 2 : 1), price_pending: false, updated_at: new Date().toISOString() }).eq("id", item.id);
      if (error) return { success: false, message: "Unable to save one of the item prices." };
    }
    const { data: refreshed, error: refreshError } = await supabase.from("service_items").select("quantity, unit_price, price_pending").eq("service_id", serviceId);
    if (refreshError || !refreshed) return { success: false, message: "Prices saved, but the invoice total could not be recalculated. Please refresh and check the service." };
    const stillPending = refreshed.some((item: { price_pending: boolean }) => item.price_pending);
    const base = refreshed.reduce((sum: number, item: { price_pending: boolean; unit_price: number | string | null; quantity: number }) => sum + (item.price_pending ? 0 : Number(item.unit_price ?? 0) * item.quantity), 0);
    const total = base * (service.is_express ? 2 : 1);
    const { data: paymentRows, error: paymentError } = await supabase.from("payments").select("amount").eq("service_id", serviceId);
    if (paymentError) return { success: false, message: "Prices saved, but payment totals could not be refreshed." };
    const paid = (paymentRows ?? []).reduce((sum: number, row: { amount: number | string | null }) => sum + Number(row.amount ?? 0), 0);
    const balance = Math.max(0, total - paid);
    const { error: updateError } = await supabase.from("services").update({ base_price: base, total_price: total, price_pending: stillPending, amount_paid: paid, balance, payment_status: stillPending ? "unpaid" : balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid", updated_by: authorization.staffId, updated_at: new Date().toISOString() }).eq("id", serviceId);
    if (updateError) return { success: false, message: "Prices saved, but the service total could not be updated. Please contact an administrator before taking payment." };
    await logStaffServiceOperation({ staffId: authorization.staffId, staffName: authorization.staffName, serviceId, action: authorization.actorRole === "staff" ? "STAFF_CONFIRM_SERVICE_PRICES" : "ADMIN_CONFIRM_SERVICE_PRICES", oldData: { price_pending: true }, newData: { base_price: base, total_price: total, price_pending: stillPending } });
    revalidatePath(`/dashboard/services/${serviceId}`);
    revalidatePath("/dashboard/services");
    return { success: true, message: stillPending ? "Prices saved. Some service items still need a quote." : "All prices confirmed and the invoice total updated." };
  } finally {
    await clearStaffWriteAuthorization(authorization.authorizationId);
  }
}
