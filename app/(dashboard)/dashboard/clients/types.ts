export type Client = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientSummary = {
  total: number;
  withPhone: number;
  withEmail: number;
};

export type ClientActionState = {
  success: boolean;
  message: string;
};

export const initialClientActionState: ClientActionState = {
  success: false,
  message: "",
};

export type ServiceRecord = {
  id: string;
  service_number: string;
  service_type_id: string | null;
  service_date: string | null;
  service_time: string | null;
  collection_date: string | null;

  total_price: number;
  deposit_amount: number;
  amount_paid: number;
  balance: number;

  payment_status: string;

  created_at: string;
  updated_at: string | null;

  client_id: string;

  service_types: {
    id: string;
    name: string;
  }[];
};