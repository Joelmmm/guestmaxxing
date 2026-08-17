import { NextResponse } from "next/server"
import * as z from "zod"
import { auth } from "./auth"
import { prisma } from "./prisma"
import { headers } from "next/headers"
import type { Prisma } from "@/generated/client"

export type OrganizationRole = "owner" | "admin" | "member"

const DEFAULT_ORGANIZATION_ROLES: readonly OrganizationRole[] = [
  "owner",
  "admin",
  "member",
]

export async function getServerSession(requestHeaders?: Headers) {
  return auth.api.getSession({
    headers: requestHeaders ?? (await headers()),
  })
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 })
}

async function findMembership(
  userId: string,
  organizationId: string,
  allowedRoles: readonly OrganizationRole[]
) {
  const membership = await prisma.member.findFirst({
    where: { userId, organizationId },
  })

  if (
    !membership ||
    !allowedRoles.includes(membership.role as OrganizationRole)
  ) {
    return null
  }

  return membership
}

/**
 * Resolves the restaurant that belongs to the currently active organization
 * for the authenticated user. Use this in all dashboard Server Components
 * instead of bare `prisma.restaurant.findFirst()`.
 *
 * Returns `null` when the user has no session, no active org, or the org
 * has no restaurant yet.
 */
type DefaultRestaurantInclude = {
  images: {
    select: {
      id: true
      mimeType: true
      altText: true
      isCover: true
    }
  }
}

export async function getOrgRestaurant<
  T extends Prisma.RestaurantInclude = Record<never, never>,
>(include?: T) {
  const session = await getServerSession()
  if (!session) return null

  let organizationId = session.session.activeOrganizationId

  let membership = organizationId
    ? await findMembership(
        session.user.id,
        organizationId,
        DEFAULT_ORGANIZATION_ROLES
      )
    : null

  if (!organizationId || !membership) {
    membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    })
    if (!membership) return null
    organizationId = membership.organizationId
  }

  const defaultInclude = {
    images: {
      select: {
        id: true,
        mimeType: true,
        altText: true,
        isCover: true,
      },
    },
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { organizationId },
    include: include ? { ...include, ...defaultInclude } : defaultInclude,
  })

  if (!restaurant) return null

  return {
    restaurant: restaurant as Prisma.RestaurantGetPayload<{
      include: T & DefaultRestaurantInclude
    }>,
    organizationId,
  }
}

/**
 * Resolves the current user's membership in their active organization.
 * Use this for org-level features (e.g. team management) that don't
 * require a restaurant to exist yet.
 *
 * Returns `null` when the user has no session or no active organization.
 */
export async function getOrgMembership() {
  const session = await getServerSession()
  if (!session) return null

  let organizationId = session.session.activeOrganizationId
  let membership = null

  if (!organizationId) {
    membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
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
    canManage: ["owner", "admin"].includes(role),
    isOwner: role === "owner",
    userId: session.user.id,
  }
}

export function validateBody<T>(schema: z.Schema<T>, body: unknown) {
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
  allowedRoles: readonly OrganizationRole[] = DEFAULT_ORGANIZATION_ROLES,
  requestHeaders?: Headers
) {
  const session = await getServerSession(requestHeaders)

  if (!session) {
    return {
      isAuthorized: false as const,
      response: unauthorizedResponse(),
    }
  }

  // Find the restaurant to get its organization ID
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { organizationId: true },
  })

  if (!restaurant) {
    return {
      isAuthorized: false as const,
      response: NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      ),
    }
  }

  // Always fetch membership to securely verify the user's current role in the organization
  const membership = await findMembership(
    session.user.id,
    restaurant.organizationId,
    allowedRoles
  )

  if (!membership) {
    return {
      isAuthorized: false as const,
      response: forbiddenResponse(
        "Forbidden: You don't have access to this restaurant"
      ),
    }
  }

  return {
    isAuthorized: true as const,
    session,
    organizationId: restaurant.organizationId,
    membership,
    response: null,
  }
}

export async function verifyOrganizationAccess(
  organizationId: string,
  allowedRoles: readonly OrganizationRole[] = DEFAULT_ORGANIZATION_ROLES,
  requestHeaders?: Headers
) {
  const session = await getServerSession(requestHeaders)

  if (!session) {
    return { isAuthorized: false as const, response: unauthorizedResponse() }
  }

  const membership = await findMembership(
    session.user.id,
    organizationId,
    allowedRoles
  )

  if (!membership) {
    return {
      isAuthorized: false as const,
      response: forbiddenResponse(
        "Forbidden: You don't have access to this organization"
      ),
    }
  }

  return {
    isAuthorized: true as const,
    session,
    organizationId,
    membership,
    response: null,
  }
}

export async function verifyReservationAccess(
  reservationId: string,
  allowedRoles: readonly OrganizationRole[] = DEFAULT_ORGANIZATION_ROLES,
  requestHeaders?: Headers
) {
  const session = await getServerSession(requestHeaders)

  if (!session) {
    return { isAuthorized: false as const, response: unauthorizedResponse() }
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, restaurantId: true },
  })

  if (!reservation) {
    return {
      isAuthorized: false as const,
      response: NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      ),
    }
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: reservation.restaurantId },
    select: { organizationId: true },
  })

  if (!restaurant) {
    return {
      isAuthorized: false as const,
      response: NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      ),
    }
  }

  const membership = await findMembership(
    session.user.id,
    restaurant.organizationId,
    allowedRoles
  )

  if (!membership) {
    return {
      isAuthorized: false as const,
      response: forbiddenResponse(
        "Forbidden: You don't have access to this reservation"
      ),
    }
  }

  return {
    isAuthorized: true as const,
    session,
    organizationId: restaurant.organizationId,
    membership,
    reservation,
    response: null,
  }
}

export async function verifyGuestAccess(
  guestId: string,
  restaurantId: string,
  allowedRoles: readonly OrganizationRole[] = DEFAULT_ORGANIZATION_ROLES,
  requestHeaders?: Headers
) {
  const access = await verifyRestaurantAccess(
    restaurantId,
    allowedRoles,
    requestHeaders
  )

  if (!access.isAuthorized) return access

  const guest = await prisma.guest.findFirst({
    where: {
      id: guestId,
      reservations: { some: { restaurantId } },
    },
    select: { id: true },
  })

  if (!guest) {
    return {
      isAuthorized: false as const,
      response: NextResponse.json(
        { error: "Guest not found" },
        { status: 404 }
      ),
    }
  }

  return { ...access, guest }
}

export async function verifyGuestReservationOwnership(
  reservationId: string,
  requestHeaders?: Headers
) {
  const session = await getServerSession(requestHeaders)

  if (!session) {
    return { isAuthorized: false as const, response: unauthorizedResponse() }
  }

  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      guest: { userId: session.user.id },
    },
    select: { id: true },
  })

  if (!reservation) {
    return {
      isAuthorized: false as const,
      response: NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      ),
    }
  }

  return { isAuthorized: true as const, session, reservation, response: null }
}

/**
 * Validates that the current authenticated user has access to the specified restaurant,
 * returning boolean flags for rendering purposes in Server Components.
 */
export async function getServerRestaurantAccess(
  restaurantId?: string,
  requestHeaders?: Headers
) {
  const session = await getServerSession(requestHeaders)

  if (!session || !restaurantId) {
    return { role: null, canManage: false, isOwner: false, isAuthorized: false }
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { organizationId: true },
  })

  const membership = restaurant
    ? await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: restaurant.organizationId,
        },
      })
    : null

  const role = membership?.role

  return {
    role,
    canManage: ["owner", "admin"].includes(role || ""),
    isOwner: role === "owner",
    isAuthorized: !!role,
    userId: session.user.id,
  }
}
