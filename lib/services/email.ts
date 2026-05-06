import { Resend } from 'resend';

// Initialize the SDK using the environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

// Define your default From address (use the sandbox for testing)
const DEFAULT_FROM = 'Reserva <onboarding@resend.dev>';

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
      subject: `${inviterName} invited you to join ${organizationName} on Reserva`,
      html: `<p><strong>${inviterName}</strong> has invited you to join the <strong>${organizationName}</strong> workspace on Reserva.</p><p>Click here to join: <a href="${inviteLink}">Accept Invitation</a></p>`,
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
