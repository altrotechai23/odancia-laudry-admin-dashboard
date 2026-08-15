import { z } from "zod";

export const createServiceSchema = z.object({
  clientId: z.string().uuid().optional(),

  clientName: z.string().min(2),

  phone: z.string().min(10),

  email: z
    .string()
    .email()
    .optional()
    .or(z.literal("")),

  serviceTypeId: z.string().uuid(),

  totalPrice: z.coerce.number().min(0),

  deposit: z.coerce.number().min(0),

  paymentMethod: z.enum([
    "cash",
    "card",
    "eft",
    "other",
  ]),

  collectionDate: z.string(),

  serviceDate: z.string(),

  serviceTime: z.string(),

  numberOfItems: z.coerce.number().optional(),

  fulfillmentMethod: z.enum([
    "customer_pickup",
    "delivery",
  ]),

  notes: z.string().optional(),
});

export type CreateServiceInput = z.infer<
  typeof createServiceSchema
>;