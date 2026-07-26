import { requireUser } from "@/lib/auth/requireUser";
import type { ParsedProfile } from "@/lib/profile";

// Resolves the logged-in user only if they're an admin, else null. Use in
// every /api/admin/* route.
export async function requireAdmin(): Promise<ParsedProfile | null> {
  const profile = await requireUser();
  if (!profile || !profile.isAdmin) return null;
  return profile;
}
