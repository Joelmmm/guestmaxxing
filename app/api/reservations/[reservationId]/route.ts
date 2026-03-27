import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface ReservationDetailParams {
  params: Promise<{
    reservationId: string
  }>
}

export async function GET(req: Request, { params }: ReservationDetailParams) {
  try {
    const { reservationId } = await params
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
      return new NextResponse('Reservation not found', { status: 404 })
    }

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('[RESERVATION_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: ReservationDetailParams) {
  try {
    const { reservationId } = await params
    const body = await req.json()
    const { status, partySize, startTime, endTime, tableIds, internalNotes, specialRequest } = body

    // 1. Basic update of the reservation itself
    const data: any = {
      status,
      partySize: partySize ? parseInt(partySize) : undefined,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      internalNotes,
      specialRequest,
    }

    // Handle table updates (disconnect existing across junction, add new ones)
    if (tableIds && tableIds.length > 0) {
      // For simplicity, we remove existing and add new
      await prisma.reservationOnTable.deleteMany({
        where: { reservationId },
      })
      data.tables = {
        create: tableIds.map((tid: string) => ({
          table: { connect: { id: tid } },
        })),
      }
    }

    const reservation = await prisma.reservation.update({
      where: { id: reservationId },
      data,
    })

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('[RESERVATION_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: ReservationDetailParams) {
  try {
    const { reservationId } = await params
    // Standard delete, cascade logic in schema takes care of junction entries
    const reservation = await prisma.reservation.delete({
      where: { id: reservationId },
    })

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('[RESERVATION_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
