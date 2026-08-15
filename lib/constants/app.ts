export const APP_NAME = "Odancia Laundry";

export const APP_DESCRIPTION =
  "Odancia Laundry business management system";

export const CURRENCY = "ZAR";

export const CURRENCY_SYMBOL = "R";

export const USER_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  STAFF: "staff",
} as const;

export type UserRole =
  (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const SERVICE_STATUSES = {
  PENDING: "pending",
  READY_FOR_COLLECTION: "ready_for_collection",
  COLLECTED: "collected",
} as const;

export type ServiceStatus =
  (typeof SERVICE_STATUSES)[keyof typeof SERVICE_STATUSES];

export const PAYMENT_METHODS = {
  CASH: "cash",
  CARD: "card",
  EFT: "eft",
  OTHER: "other",
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const FULFILMENT_METHODS = {
  DELIVERY: "delivery",
  CUSTOMER_COLLECTION: "customer_collection",
} as const;

export type FulfilmentMethod =
  (typeof FULFILMENT_METHODS)[keyof typeof FULFILMENT_METHODS];