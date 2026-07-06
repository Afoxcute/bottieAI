import type { User } from "@privy-io/react-auth";

/**
 * Best-effort first name for greetings — falls back through Google/Apple
 * profile name, then the local part of the user's email, so every login
 * method (Google, Apple, or email-only) resolves to something displayable.
 */
export function getUserFirstName(user: User | null | undefined): string | undefined {
  const google = user?.google?.name?.split(" ")[0];
  if (google) return google;

  const apple = (user?.apple as { firstName?: string } | undefined)?.firstName;
  if (apple) return apple;

  const email = user?.email?.address || user?.google?.email;
  if (email) return email.split("@")[0];

  return undefined;
}
