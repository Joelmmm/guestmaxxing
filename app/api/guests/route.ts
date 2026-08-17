import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createGuestSchema } from "@/lib/validations/guest"
import { validateBody, verifyRestaurantAccess } from "@/lib/api-utils"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")
    const restaurantId = searchParams.get("restaurantId")

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID is required" },
        { status: 400 }
      )
    }

    const access = await verifyRestaurantAccess(
      restaurantId,
      ["owner", "admin", "member"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const where = {
      reservations: { some: { restaurantId } },
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" as const } },
              { lastName: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }

    const guests = await prisma.guest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query ? 50 : 20, // Limit for better performance
    })

    return NextResponse.json(guests)
  } catch (error) {
    console.error("[GUESTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = validateBody(createGuestSchema, body)

    if (!validation.isValid) {
      return validation.response
    }

    const { restaurantId, firstName, lastName, email, phone, notes } =
      validation.data

    const access = await verifyRestaurantAccess(
      restaurantId,
      ["owner", "admin", "member"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const guest = await prisma.guest.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        notes,
      },
    })

    return NextResponse.json(guest)
  } catch (error) {
    console.error("[GUESTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
