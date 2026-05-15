import { prisma } from '@/lib/prisma';

export interface UpsertGuestForUserInput {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/**
 * Links a domain Guest record to a Better Auth User identity.
 *
 * Strategy (in priority order):
 * 1. A Guest already linked to this userId  → update contact info, return it.
 * 2. A Guest with a matching email (no userId yet) → claim it by setting userId.
 * 3. No match → create a fresh Guest linked to userId.
 *
 * This is always called after `signIn.emailOtp()` succeeds, so the user.id
 * is guaranteed to exist in the `user` table at this point.
 */
export async function upsertGuestForUser(
  input: UpsertGuestForUserInput
): Promise<{ guestId: string }> {
  const { userId, email, firstName, lastName, phone } = input;

  // 1. Already-linked guest
  const linkedGuest = await prisma.guest.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (linkedGuest) {
    await prisma.guest.update({
      where: { id: linkedGuest.id },
      data: {
        firstName,
        lastName,
        ...(phone?.trim() ? { phone } : {}),
      },
    });
    return { guestId: linkedGuest.id };
  }

  // 2. Unlinked guest with same email → claim it
  const emailGuest = await prisma.guest.findUnique({
    where: { email },
    select: { id: true, userId: true },
  });

  if (emailGuest && !emailGuest.userId) {
    await prisma.guest.update({
      where: { id: emailGuest.id },
      data: {
        userId,
        firstName,
        lastName,
        ...(phone?.trim() ? { phone } : {}),
      },
    });
    return { guestId: emailGuest.id };
  }

  // 3. Create brand-new guest linked to userId
  const newGuest = await prisma.guest.create({
    data: {
      userId,
      firstName,
      lastName,
      email: email || undefined,
      phone: phone?.trim() || undefined,
    },
    select: { id: true },
  });

  return { guestId: newGuest.id };
}
