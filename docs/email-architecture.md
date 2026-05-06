# Email Architecture

Transactional email is delivered via **Resend** (`lib/services/email.ts`). This file is the single allowed point of contact with the Resend SDK — no API route or Server Action calls `resend.emails.send()` directly.

## Sandbox Constraints

While `RESEND_API_KEY` is set, sending requires a verified domain. During local development, `onboarding@resend.dev` can only deliver to the email registered on the Resend account. Upgrade to a custom domain in the Resend Dashboard when moving toward production.

## Key Decisions

**`inviteMember` vs `getInvitationURL`**  
The team invite UI uses `authClient.organization.inviteMember()`. The alternative, `getInvitationURL`, only returns a link without triggering the `sendInvitationEmail` hook in `lib/auth.ts` — no email is sent. Do not switch these.

**Invite link parameter is `?id=`**  
Three files are coupled to this convention: `lib/auth.ts` (generates), `app/(onboarding)/onboarding/page.tsx` (generates), and `app/accept-invite/page.tsx` (consumes). A mismatch silently breaks the flow — the accept page will 404 the invitation lookup.

**Resend SDK never throws**  
The SDK returns `{ data, error }`. All service functions check `error` explicitly and return `{ success, error }` upstream. Do not wrap calls in `try/catch` expecting an exception.

## Planned Events

| Event | Where to wire it |
|-------|-----------------|
| Guest reservation confirmation | `lib/services/reservations.ts` after `createReservation` |
| Admin: new reservation alert | Same as above |
| Feedback acknowledgment | Feedback Server Action (`app/actions/`) |
