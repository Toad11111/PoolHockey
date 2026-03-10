import { getUser } from "@/lib/auth/session";
import { success, error } from "@/lib/utils/api-response";

/**
 * GET /api/v1/auth/me
 *
 * Returns the current authenticated user's profile.
 */
export async function GET() {
  const user = await getUser();
  if (!user) {
    return error("UNAUTHORIZED", "Not authenticated", 401);
  }

  return success(user);
}
