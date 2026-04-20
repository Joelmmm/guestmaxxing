"use client"
import { authClient } from "@/lib/auth-client"

export function useOrganizationRoles() {
  const { data: session, isPending } = authClient.useSession();
  
  // The organization plugin extends the session with activeOrganization
  const activeOrg = (session?.session as any)?.activeOrganization;
  const role = activeOrg?.role || null;

  return {
    role,
    canManage: ['owner', 'admin'].includes(role || ''),
    isOwner: role === 'owner',
    isLoading: isPending
  };
}
