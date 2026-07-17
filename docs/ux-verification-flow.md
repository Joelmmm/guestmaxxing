# UX/Product Design: Contact Verification & Reservation Flow

## 1. The Objective
To ensure high-quality reservations, reduce no-shows, and provide guests with a seamless way to manage their bookings, the reservation widget implements a **Pre-Booking Contact Verification** step paired with an **Accountless Management Hub**.

## 2. The Recommended Flow
The user journey is structured to gather intent first, verify identity, and then process the transaction:

1. **Search:** Guest inputs Date & Group Size.
2. **Select:** Guest picks an available Time.
3. **Details:** Guest provides Name, Email, and Phone number.
4. **Verification (OTP):** Guest receives a 4-digit code via their chosen channel (Email/SMS).
5. **Transaction:** Upon entering the correct OTP, the frontend submits the reservation.
6. **Success:** Guest receives a confirmation message with a management link.

## 3. Architectural Synergy (No "Pending" Locks Needed)
Thanks to the backend's **Late-Stage Dynamic Table Assignment** (detailed in `reservation-concurrency.md`), this verification flow requires **zero database locks**. 

Because tables are dynamically assigned at the exact millisecond of the final transaction, we do not need to create messy "Pending" reservations that require cron jobs to clean up if a user abandons the OTP screen. The frontend simply holds the booking state in memory until the OTP is verified.

## 4. Managing UX Edge Cases

### A. The "Valentine's Day Problem" (409 Conflict after Verification)
Because we don't lock tables during the OTP step, highly competitive timeslots might sell out while the user is typing their code. When they submit, the backend transaction will correctly return a `409 Conflict`.
* **The UX Solution:** The UI must gracefully handle this error. It should **not** force the user to re-verify. Instead, drop a secure "verified" token in state/cookies, and return the user to the Time Selection screen with a message: *"You're verified! Unfortunately, that specific timeslot just filled up. Please pick another available time to instantly book."*

### B. The "Wrong Number" Problem
Users frequently mistype their contact info and will wait for a code that never arrives.
* **The UX Solution:** The OTP screen must explicitly state where the code was sent (*"Sent to joel@example.com"*). Next to it, provide a clear **"Edit"** button that takes them back to the Details step without clearing their existing inputs.

### C. The "Spam" Problem
Impatient users may click "Resend Code" multiple times, incurring high SMS/Email API costs and receiving confusing, out-of-order codes.
* **The UX Solution:** Implement a visual cooldown timer (e.g., 30-60 seconds) on the "Resend Code" button.

## 5. The Accountless Management Hub
Modern UX discourages forcing users to create an account for a single reservation.
* **The Solution:** The confirmation email includes a link to guestmaxxing.com/manage. When the guest arrives there, they enter their email and receive a new OTP — no password, no separate signed-token infrastructure.
* This reuses the `email-otp` plugin already powering pre-booking verification, so there is nothing extra to build or rotate.
* **Note:** An earlier version of this doc described a `?token=xyz987` magic-link approach. That pattern was superseded by the OTP re-auth decision in `guest-auth-integration.md` and should not be implemented.
