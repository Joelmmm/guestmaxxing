import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { organization } from "better-auth/plugins";
import { sendTeamInvitation } from "./services/email";

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
    ],
});

export type Session = typeof auth.$Infer.Session;
