import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateReservation, deleteReservation } from '@/lib/services/reservations'

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
    
    const reservation = await updateReservation(reservationId, body)
    
    return NextResponse.json(reservation)
  } catch (error) {
    console.error('[RESERVATION_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: ReservationDetailParams) {
  try {
    const { reservationId } = await params
    
    const reservation = await deleteReservation(reservationId)

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('[RESERVATION_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
