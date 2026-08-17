import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { restaurantSchema } from "@/lib/validations/restaurant"
import {
  getServerSession,
  validateBody,
  verifyOrganizationAccess,
} from "@/lib/api-utils"
import { createRestaurant } from "@/lib/services/restaurants"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(req.headers)

    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const organizationId = session.session.activeOrganizationId

    if (!organizationId) {
      return NextResponse.json([]) // No org selected = no restaurants
    }

    const access = await verifyOrganizationAccess(
      organizationId,
      ["owner", "admin", "member"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const restaurants = await prisma.restaurant.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            diningAreas: true,
            reservations: true,
          },
        },
      },
    })
    return NextResponse.json(restaurants)
  } catch (error) {
    console.error("[RESTAURANTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(req.headers)

    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const organizationId = session.session.activeOrganizationId

    if (!organizationId) {
      return new NextResponse(
        "You must select an organization before creating a restaurant",
        { status: 400 }
      )
    }

    const access = await verifyOrganizationAccess(
      organizationId,
      ["owner", "admin"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    // Enforce MVP limit: 1 restaurant per organization
    const existingRestaurant = await prisma.restaurant.findFirst({
      where: { organizationId },
    })

    if (existingRestaurant) {
      return new NextResponse(
        "You can only create one restaurant per workspace in the current version",
        { status: 403 }
      )
    }

    const body = await req.json()
    const validation = validateBody(restaurantSchema, body)

    if (!validation.isValid) {
      return validation.response
    }

    const { name, timezone, contactEmail, contactPhone } = validation.data

    const restaurant = await createRestaurant({
      name,
      timezone: timezone || "America/Santiago",
      contactEmail: contactEmail,
      contactPhone: contactPhone || undefined,
      organizationId,
    })

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error("[RESTAURANTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
