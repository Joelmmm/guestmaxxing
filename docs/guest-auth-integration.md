# Guest Auth Integration Architecture

## Context

The public booking widget requires contact verification (OTP) before a reservation is committed, and a way for guests to return and manage their bookings without a password. This document covers how Better Auth is integrated for the guest-facing (B2C) flow, and how that differs from the staff-facing (B2B) flow.

## Decisions

### Better Auth Scope

Better Auth handles **all** identity and session concerns — for both guests and staff. The split is:

- **Staff (B2B):** Users with a `Member` row linked to an `Organization`. They access the dashboard.
- **Guests (B2C):** Users without a `Member` row. They access the guest portal (reservations, their data, platform offerings). The UI forks on this condition alone.

### OTP Mechanism: `email-otp` Plugin

The `email-otp` plugin handles the pre-booking verification step described in `ux-verification-flow.md`. It owns:

- OTP generation and delivery (via the `sendVerificationOTP` hook, implemented with Resend)
- The `Verification` table (managed by Better Auth — do not use directly)
- Rate limiting and expiry
- Session creation on successful verification

**Do not build a custom OTP flow.** The `Verification` table belongs to Better Auth's internals.

### The `Guest` Model: Kept as a Bridge

The `Guest` model is retained as the domain record for all booking-related identity. It is **not** replaced by Better Auth's `User` model. Instead, an optional `userId` FK bridges them:

```prisma
model Guest {
  id        String  @id @default(uuid())
  firstName String
  lastName  String
  email     String? @unique
  phone     String?
  notes     String?
  userId    String? @unique        // nullable bridge to Better Auth User
  user      User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  reservations Reservation[]
  ...
}
```

This preserves:
- **Walk-in bookings** (`userId: null`) — no email required, no placeholder accounts.
- **Operational queries** — guest notes, history, and restaurant-specific data live in the domain model, not in Better Auth's user table.
- **GDPR compliance** — deleting the `User` sets `Guest.userId` to null via `SetNull`, same pattern already in use for `Reservation.guestId`.

### The Booking Flow

The widget checks for an active session on load before deciding whether to require OTP.

**First-time guest (no session):**
```
1. Guest fills in Name, Email, Phone
2. Frontend calls:  authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })
3. Guest enters OTP
4. Frontend calls:  authClient.signIn.emailOtp({ email, otp })
   → Better Auth creates a User + drops a Session cookie
5. Server Action:   upsert Guest { userId } linked to the new User
6. Reservation is created and associated with the Guest
```

**Returning guest (valid session exists):**
```
1. Widget calls:    authClient.getSession()
   → Session found → OTP step skipped entirely
2. Guest fills in Name, Email, Phone (pre-filled from Guest record)
3. Reservation is created and associated with the existing Guest
```

Steps 4–5 in the first-time flow are the integration seam. Better Auth owns everything before it; the domain service layer owns everything after.

### Walk-in / Phone Bookings

Staff create these directly via the dashboard. A `Guest` record is created with `userId: null`. No OTP is involved. The `BookingSource` enum (`WALK_IN`, `PHONE`) distinguishes these from `ONLINE` bookings.

### Return Guests (Repeat Visits)

`signIn.emailOtp()` auto-creates a `User` on first verification and silently logs the same user back in on every subsequent one. The `Guest` record persists via the `userId` bridge, so reservation history, notes, and preferences are automatically restored.

**Impersonation threat model:**

| Scenario | Outcome |
|---|---|
| Impersonator enters victim's email, no session present | OTP is sent to victim's inbox — impersonator is blocked |
| Returning guest, valid session present | Session *is* the proof of identity; OTP not required |
| Session theft (cookie stolen) | Standard session security applies: `httpOnly` cookies, HTTPS, session expiry |

OTP gates access when there is no session. Once a session exists, it carries the proof of email ownership established at the time it was created. Per-booking OTP for already-authenticated users adds friction without meaningful security benefit.

### Magic Link (Accountless Management)

The confirmation email includes a link back to the guest's reservation management page. Rather than a custom signed token, the return flow reuses `email-otp` sign-in: the guest is prompted for their email, receives a new OTP, and is logged back in. This eliminates a separate Magic Link token system while keeping the experience passwordless.

## Plugins Used (Guest Flow)

| Plugin | Purpose |
|---|---|
| `emailOTP` (server) | Sends OTP, validates code, manages Verification table |
| `emailOTPClient` (client) | `sendVerificationOtp`, `signIn.emailOtp` |
| `anonymous` | **Not used** — anonymous sessions are not needed; guests provide email before OTP |

## What This Is Not

- The `twoFactor` plugin is not part of the guest flow. It is reserved for staff accounts if added in the future.
- The `anonymous` plugin is not used. The UX flow collects email before any OTP is sent, so there is no pre-email anonymous session state to manage.
