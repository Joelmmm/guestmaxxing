import { Resend } from 'resend';

// Initialize the SDK using the environment variable
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

// Define your default From address (use the sandbox for testing)
const DEFAULT_FROM = 'Guestmaxxing <onboarding@gasti.tech>';

/**
 * Sends a Team Invitation email via Better Auth's workflow
 */
export async function sendTeamInvitation(
  to: string,
  inviterName: string,
  organizationName: string,
  inviteLink: string
) {
  const { data, error } = await resend.emails.send(
    {
      from: DEFAULT_FROM,
      to: [to],
      subject: `${inviterName} invited you to join ${organizationName} on Guestmaxxing`,
      html: `<p><strong>${inviterName}</strong> has invited you to join the <strong>${organizationName}</strong> workspace on Guestmaxxing.</p><p>Click here to join: <a href="${inviteLink}">Accept Invitation</a></p>`,
    },
    // Idempotency key prevents double-sending if the network drops
    { idempotencyKey: `invite-${to}-${Date.now()}` }
  );

  if (error) {
    console.error('Failed to send team invitation:', error);
    return { success: false, error };
  }

  return { success: true, data };
}

/**
 * Sends User Feedback to the system admins
 */
export async function sendUserFeedback(
  userEmail: string,
  feedbackContent: string
) {
  const { data, error } = await resend.emails.send(
    {
      from: DEFAULT_FROM,
      // For testing, send to the Resend testing email or your own registered email
      to: ['delivered@resend.dev'], 
      subject: `New Feedback from ${userEmail}`,
      html: `<p><strong>Feedback from ${userEmail}:</strong></p><p>${feedbackContent}</p>`,
    },
    { idempotencyKey: `feedback-${userEmail}-${Date.now()}` }
  );

  if (error) {
    console.error('Failed to send user feedback:', error);
    return { success: false, error };
  }

  return { success: true, data };
}

/**
 * Sends a guest-facing OTP email for booking verification.
 * Called by the Better Auth emailOtp plugin's sendVerificationOTP hook.
 *
 * type: "sign-in" | "email-verification" | "forget-password"
 * Only "sign-in" is used in the guest booking flow.
 */
export async function sendOtpEmail(
  to: string,
  otp: string,
  type: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email'
) {
  const subject =
    type === 'sign-in'
      ? 'Your Guestmaxxing booking verification code'
      : type === 'email-verification'
        ? 'Verify your Guestmaxxing email address'
        : type === 'change-email'
          ? 'Confirm your new Guestmaxxing email address'
          : 'Reset your Guestmaxxing password';

  const headline =
    type === 'sign-in'
      ? 'Your one-time booking code'
      : type === 'email-verification'
        ? 'Verify your email'
        : type === 'change-email'
          ? 'Confirm your new email'
          : 'Reset your password';

  const description =
    type === 'sign-in'
      ? 'Enter this code to confirm your reservation. It expires in 10 minutes.'
      : type === 'email-verification'
        ? 'Enter this code to verify your email address. It expires in 10 minutes.'
        : type === 'change-email'
          ? 'Enter this code to confirm your new email address. It expires in 10 minutes.'
          : 'Enter this code to reset your password. It expires in 10 minutes.';

  // Idempotency window: 1-minute bucket prevents duplicate sends on retry
  // without blocking legitimate re-sends (guests can request a new code).
  const minuteBucket = Math.floor(Date.now() / 60_000);
  const idempotencyKey = `otp-${type}-${to}-${minuteBucket}`;

  const { data, error } = await resend.emails.send(
    {
      from: DEFAULT_FROM,
      to: [to],
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">${headline}</h2>
          <p style="margin: 0 0 24px; color: #555; font-size: 15px;">${description}</p>
          <div style="background: #f4f4f5; border-radius: 8px; padding: 20px 24px; text-align: center; letter-spacing: 6px; font-size: 32px; font-weight: 700; color: #111; font-variant-numeric: tabular-nums;">
            ${otp}
          </div>
          <p style="margin: 24px 0 0; color: #999; font-size: 13px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    },
    { idempotencyKey }
  );

  if (error) {
    console.error('[sendOtpEmail] Failed to send OTP:', error);
    return { success: false, error };
  }

  return { success: true, data };
}
