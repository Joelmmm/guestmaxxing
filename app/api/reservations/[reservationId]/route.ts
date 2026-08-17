import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  updateReservation,
  deleteReservation,
} from "@/lib/services/reservations"
import { verifyReservationAccess } from "@/lib/api-utils"

interface ReservationDetailParams {
  params: Promise<{
    reservationId: string
  }>
}

export async function GET(req: Request, { params }: ReservationDetailParams) {
  try {
    const { reservationId } = await params
    const access = await verifyReservationAccess(
      reservationId,
      ["owner", "admin", "member"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        guest: true,
        tables: {
          include: {
            table: {
              include: { diningArea: true },
            },
          },
        },
      },
    })

    if (!reservation) {
      return new NextResponse("Reservation not found", { status: 404 })
    }

    return NextResponse.json(reservation)
  } catch (error) {
    console.error("[RESERVATION_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: ReservationDetailParams) {
  try {
    const { reservationId } = await params
    const access = await verifyReservationAccess(
      reservationId,
      ["owner", "admin", "member"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const body = await req.json()

    const reservation = await updateReservation(reservationId, body)

    return NextResponse.json(reservation)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "RESERVATION_NOT_FOUND") {
        return new NextResponse("Reservation not found", { status: 404 })
      }
      if (error.message === "SPECIFIC_TABLES_INVALID") {
        return new NextResponse(
          "One or more tables do not belong to this restaurant",
          { status: 400 }
        )
      }
      if (error.message === "INVALID_RESERVATION_STATUS") {
        return new NextResponse("Invalid reservation status", { status: 400 })
      }
      if (error.message === "INVALID_RESERVATION_TIME") {
        return new NextResponse("Invalid reservation time", { status: 400 })
      }
      if (error.message === "SPECIFIC_TABLES_BOOKED") {
        return new NextResponse(
          "One or more specific tables are already booked for this time slot.",
          { status: 409 }
        )
      }
      if (error.message === "RESTAURANT_CLOSED") {
        return new NextResponse(
          "The restaurant is closed on the selected date.",
          { status: 409 }
        )
      }
      if (error.message === "OUTSIDE_OPERATING_HOURS") {
        return new NextResponse(
          "The requested time falls outside operating hours.",
          { status: 409 }
        )
      }
      if (error.message === "NO_TABLES_AVAILABLE") {
        return new NextResponse(
          "No tables available for this party size at the requested time.",
          { status: 409 }
        )
      }
      if (error.message === "CONCURRENT_BOOKING_FAILED") {
        return new NextResponse(
          "Transaction failed due to a concurrent booking. Please try again.",
          { status: 409 }
        )
      }
    }

    console.error("[RESERVATION_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: ReservationDetailParams
) {
  try {
    const { reservationId } = await params
    const access = await verifyReservationAccess(
      reservationId,
      ["owner", "admin", "member"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const reservation = await deleteReservation(reservationId)

    return NextResponse.json(reservation)
  } catch (error) {
    console.error("[RESERVATION_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
