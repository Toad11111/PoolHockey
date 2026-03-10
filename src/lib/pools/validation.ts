import { z } from "zod/v4";

export const createPoolSchema = z
  .object({
    name: z
      .string()
      .min(1, "Pool name is required")
      .max(50, "Pool name must be 50 characters or less"),
    rosterSize:    z.number().int().min(1).max(30),
    maxForwards:   z.number().int().min(0),
    maxDefensemen: z.number().int().min(0),
    maxGoalies:    z.number().int().min(0),
    maxWildcards:  z.number().int().min(0).default(0),
  })
  .refine(
    (d) => d.maxForwards + d.maxDefensemen + d.maxGoalies + d.maxWildcards === d.rosterSize,
    { message: "Position limits must add up to roster size" }
  );

export const joinPoolSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
});
