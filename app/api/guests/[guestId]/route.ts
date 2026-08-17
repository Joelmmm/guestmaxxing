import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { guestSchema } from "@/lib/validations/guest"
import { validateBody, verifyGuestAccess } from "@/lib/api-utils"

interface GuestDetailParams {
  params: Promise<{
    guestId: string
  }>
}

export async function GET(req: Request, { params }: GuestDetailParams) {
  try {
    const { guestId } = await params
    const restaurantId = new URL(req.url).searchParams.get("restaurantId")

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID is required" },
        { status: 400 }
      )
    }

    const access = await verifyGuestAccess(
      guestId,
      restaurantId,
      ["owner", "admin", "member"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        reservations: {
          where: { restaurantId },
          take: 5,
          orderBy: { reservationDate: "desc" },
          include: {
            restaurant: {
              select: { name: true },
            },
          },
        },
      },
    })

    if (!guest) {
      return new NextResponse("Guest not found", { status: 404 })
    }

    return NextResponse.json(guest)
  } catch (error) {
    console.error("[GUEST_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: GuestDetailParams) {
  try {
    const { guestId } = await params
    const restaurantId = new URL(req.url).searchParams.get("restaurantId")

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID is required" },
        { status: 400 }
      )
    }

    const access = await verifyGuestAccess(
      guestId,
      restaurantId,
      ["owner", "admin", "member"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const body = await req.json()
    const validation = validateBody(guestSchema, body)
    if (!validation.isValid) return validation.response

    const foreignReservation = await prisma.reservation.findFirst({
      where: {
        guestId,
        restaurant: { organizationId: { not: access.organizationId } },
      },
      select: { id: true },
    })

    if (foreignReservation) {
      return NextResponse.json(
        {
          error:
            "This shared guest profile cannot be edited from one organization.",
        },
        { status: 409 }
      )
    }

    const { firstName, lastName, email, phone, notes } = validation.data

    const guest = await prisma.guest.update({
      where: { id: guestId },
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
    console.error("[GUEST_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: GuestDetailParams) {
  try {
    const { guestId } = await params
    const restaurantId = new URL(req.url).searchParams.get("restaurantId")

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID is required" },
        { status: 400 }
      )
    }

    const access = await verifyGuestAccess(
      guestId,
      restaurantId,
      ["owner", "admin"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const foreignReservation = await prisma.reservation.findFirst({
      where: {
        guestId,
        restaurant: { organizationId: { not: access.organizationId } },
      },
      select: { id: true },
    })

    if (foreignReservation) {
      return NextResponse.json(
        {
          error:
            "This shared guest profile cannot be deleted from one organization.",
        },
        { status: 409 }
      )
    }

    const guest = await prisma.guest.delete({
      where: { id: guestId },
    })

    return NextResponse.json(guest)
  } catch (error) {
    console.error("[GUEST_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
