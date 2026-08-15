export type PaymentStatus =
  | "paid"
  | "partial"
  | "unpaid";

export type PaymentRecord = {
  id: string;
  service_number: string | null;
  service_date: string | null;

  total_price: number | null;
  deposit_amount: number | null;
  amount_paid: number | null;
  balance: number | null;

  payment_status: string | null;
  service_status: string | null;

  created_at: string;
  updated_at: string;

  client: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;

  service_type: {
    id: string;
    name: string;
  } | null;
};

export type PaymentSummary = {
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  totalDeposits: number;

  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  totalCount: number;
};