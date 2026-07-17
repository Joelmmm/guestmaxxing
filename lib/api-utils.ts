import { NextResponse } from "next/server"
import * as z from "zod"
import { auth } from "./auth"
import { prisma } from "./prisma"
import { headers } from "next/headers"
import type { Prisma } from "@/generated/client"

/**
 * Resolves the restaurant that belongs to the currently active organization
 * for the authenticated user. Use this in all dashboard Server Components
 * instead of bare `prisma.restaurant.findFirst()`.
 *
 * Returns `null` when the user has no session, no active org, or the org
 * has no restaurant yet.
 */
export async function getOrgRestaurant<T extends Prisma.RestaurantInclude>(
  include?: T
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  let organizationId = session.session.activeOrganizationId

  if (!organizationId) {
    const fallbackMembership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' }
    })
    if (!fallbackMembership) return null
    organizationId = fallbackMembership.organizationId
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { organizationId },
    ...(include ? { include } : {}),
  })

  if (!restaurant) return null

  return { restaurant: restaurant as Prisma.RestaurantGetPayload<{ include: T }>, organizationId }
}

/**
 * Resolves the current user's membership in their active organization.
 * Use this for org-level features (e.g. team management) that don't
 * require a restaurant to exist yet.
 *
 * Returns `null` when the user has no session or no active organization.
 */
export async function getOrgMembership() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  let organizationId = session.session.activeOrganizationId
  let membership = null

  if (!organizationId) {
    membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' }
    })
    if (!membership) return null
    organizationId = membership.organizationId
  } else {
    membership = await prisma.member.findFirst({
      where: { userId: session.user.id, organizationId },
    })
  }

  if (!membership) return null

  const role = membership.role
  return {
    organizationId,
    membership,
    role,
    canManage: ['owner', 'admin'].includes(role),
    isOwner: role === 'owner',
    userId: session.user.id,
  }
}

export function validateBody<T>(schema: z.Schema<T>, body: any) {
  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      isValid: false as const,
      errors: result.error.issues,
      response: NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      ),
    }
  }
  return {
    isValid: true as const,
    data: result.data,
  }
}

export async function verifyRestaurantAccess(
  restaurantId: string,
  allowedRoles: string[] = ['owner', 'admin', 'member']
) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return {
      isAuthorized: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Find the restaurant to get its organization ID
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { organizationId: true },
  });

  if (!restaurant) {
    return {
      isAuthorized: false as const,
      response: NextResponse.json({ error: "Restaurant not found" }, { status: 404 }),
    };
  }

  // Always fetch membership to securely verify the user's current role in the organization
  const membership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: restaurant.organizationId as string,
    },
  });

  if (!membership) {
    return {
      isAuthorized: false as const,
      response: NextResponse.json({ error: "Forbidden: You don't have access to this restaurant" }, { status: 403 }),
    };
  }

  if (!allowedRoles.includes(membership.role)) {
    return {
      isAuthorized: false as const,
      response: NextResponse.json({ error: "Forbidden: Insufficient permissions for this action" }, { status: 403 }),
    };
  }

  return { isAuthorized: true as const, session, organizationId: restaurant.organizationId as string, membership, response: null };
}

/**
 * Validates that the current authenticated user has access to the specified restaurant,
 * returning boolean flags for rendering purposes in Server Components.
 */
export async function getServerRestaurantAccess(restaurantId?: string) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !restaurantId) {
    return { role: null, canManage: false, isOwner: false, isAuthorized: false };
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { organizationId: true }
  });

  const membership = restaurant ? await prisma.member.findFirst({
    where: { userId: session.user.id, organizationId: restaurant.organizationId }
  }) : null;

  const role = membership?.role;

  return {
    role,
    canManage: ['owner', 'admin'].includes(role || ''),
    isOwner: role === 'owner',
    isAuthorized: !!role,
    userId: session.user.id
  };
}
