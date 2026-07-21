import { getSessionUserId } from "@/lib/auth/session";
import { getProfileById } from "@/lib/user";
import type { ParsedProfile } from "@/lib/profile";

// Resolves the logged-in user's full profile from the session cookie, or null
// if there is no valid session. Use in every API route that reads/writes
// user-scoped data (profile, applications, matches, tailoring, export).
export async function requireUser(): Promise<ParsedProfile | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getProfileById(userId);
}
