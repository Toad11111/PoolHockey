import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";
import { profileSchema } from "@/lib/auth/validation";
import { success, error } from "@/lib/utils/api-response";

/**
 * POST /api/v1/auth/profile
 *
 * Creates the app profile row for the authenticated Supabase user.
 * The user ID comes from the server-side session — never from the client.
 */
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return error("UNAUTHORIZED", "You must be logged in", 401);
  }

  // Check if profile already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
  });
  if (existing) {
    return error("PROFILE_EXISTS", "Profile already exists", 409);
  }

  // Validate request body
  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return error("VALIDATION_ERROR", firstError, 400);
  }

  const { username } = parsed.data;

  // Check username uniqueness
  const usernameTaken = await db.query.users.findFirst({
    where: eq(users.username, username.toLowerCase()),
  });
  if (usernameTaken) {
    return error("USERNAME_TAKEN", "This username is already taken", 409);
  }

  // Create profile — id comes from the authenticated session, not the client
  const [profile] = await db
    .insert(users)
    .values({
      id: authUser.id,
      email: authUser.email!,
      username: username.toLowerCase(),
      displayName: username,
    })
    .returning();

  return success(profile, 201);
}
