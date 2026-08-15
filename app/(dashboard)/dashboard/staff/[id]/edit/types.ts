// app/(dashboard)/dashboard/staff/[id]/edit/types.ts

export type UpdateStaffRole =
  | "staff"
  | "admin"
  | "owner";

export type UpdateStaffState = {
  success: boolean;
  message: string;
};

export type StaffProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: UpdateStaffRole;
  avatar_url: string | null;
  is_active: boolean;
  email: string;
};

export const initialUpdateStaffState: UpdateStaffState = {
  success: false,
  message: "",
};