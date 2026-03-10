import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the authenticated Supabase user + app profile.
 * Use this in server components and API routes.
 *
 * Returns null if not authenticated or no profile exists.
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const profile = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
  });

  return profile ?? null;
}

/**
 * Get the Supabase auth user only (no profile lookup).
 * Use this when you need just the auth ID, e.g. during profile creation.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
