import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { organization } from "better-auth/plugins/organization";
import { emailOTP } from "better-auth/plugins/email-otp";
import { sendTeamInvitation, sendOtpEmail } from "./services/email";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    plugins: [
        organization({
            async sendInvitationEmail(data) {
                const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invite?id=${data.invitation.id}`;
                await sendTeamInvitation(
                    data.email,
                    data.inviter.user.name || "A team member",
                    data.organization.name,
                    inviteLink
                );
            },
        }),
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                // Only sign-in type is used in the guest booking flow.
                // email-verification and forget-password are not part of the B2C flow.
                await sendOtpEmail(email, otp, type);
            },
            // OTPs expire after 10 minutes — gives guests enough time to check email
            otpLength: 6,
            expiresIn: 600,
        }),
    ],
});

export type Session = typeof auth.$Infer.Session;
