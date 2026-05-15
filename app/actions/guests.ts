"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { upsertGuestForUser } from "@/lib/services/guests"

export interface UpsertGuestActionInput {
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UpsertGuestActionResult {
  success: boolean;
  guestId?: string;
  error?: string;
}

/**
 * Server Action: upsertGuestForUserAction
 *
 * Called immediately after authClient.signIn.emailOtp() resolves on the client.
 * At that point the Better Auth session cookie is already set, so we can read
 * the authenticated user via auth.api.getSession().
 *
 * The email comes from the session (not from the client payload) to prevent
 * a malicious caller from linking a guest to a different email.
 */
export async function upsertGuestForUserAction(
  input: UpsertGuestActionInput
): Promise<UpsertGuestActionResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "NOT_AUTHENTICATED" };
    }

    const { id: userId, email } = session.user;

    const { guestId } = await upsertGuestForUser({
      userId,
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    });

    return { success: true, guestId };
  } catch (error: any) {
    console.error("[upsertGuestForUserAction]", error);
    return { success: false, error: error.message || "GUEST_UPSERT_FAILED" };
  }
}
