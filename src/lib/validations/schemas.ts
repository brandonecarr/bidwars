import { z } from "zod";

export const createSessionSchema = z.object({
  sessionName: z.string().min(1, "Session name is required").max(50),
  adminName: z.string().min(1, "Name is required").max(30),
  startingMoney: z.number().int().min(100).max(10_000_000).default(1000),
});

export const joinSessionSchema = z.object({
  code: z
    .string()
    .min(5, "Code must be 5 characters")
    .max(5)
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, "Name is required").max(30),
});

export const addItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  startingBid: z.number().int().min(1).default(1),
  anonMode: z.enum(["visible", "hidden", "partial"]).default("visible"),
  anonHint: z.string().max(50).optional(),
});

export const placeBidSchema = z.object({
  roundId: z.string().uuid(),
  amount: z.number().int().min(1),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
