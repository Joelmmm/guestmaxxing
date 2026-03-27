import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reservationSchema } from '@/lib/validations/reservation'
import { validateBody } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')
    const date = searchParams.get('date') // YYYY-MM-DD
    const status = searchParams.get('status')

    const where: any = {}

    if (restaurantId) {
      where.restaurantId = restaurantId
    }
    if (date) {
      where.reservationDate = new Date(date)
    }
    if (status) {
      where.status = status
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        guest: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        tables: {
          include: {
            table: {
              select: { name: true, diningArea: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    })

    return NextResponse.json(reservations)
  } catch (error) {
    console.error('[RESERVATIONS_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = validateBody(reservationSchema, body)

    if (!validation.isValid) {
      return validation.response
    }

    const {
      restaurantId,
      guestId,
      guestData,
      partySize,
      reservationDate,
      startTime,
      endTime,
      tableIds,
    } = validation.data

    // 1. Resolve Guest
    let resolvedGuestId = guestId

    if (!resolvedGuestId && guestData && (guestData.email || guestData.phone)) {
      // Find or create guest
      const existingGuest = await prisma.guest.findFirst({
        where: {
          OR: [
            guestData.email ? { email: guestData.email } : {},
            guestData.phone ? { phone: guestData.phone } : {},
          ].filter((cond) => Object.keys(cond).length > 0),
        },
      })

      if (existingGuest) {
        resolvedGuestId = existingGuest.id
      } else {
        const newGuest = await prisma.guest.create({
          data: {
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            email: guestData.email,
            phone: guestData.phone,
          },
        })
        resolvedGuestId = newGuest.id
      }
    }

    if (!resolvedGuestId && guestData) {
       // Create guest even without unique identifiers (simplified for walk-ins)
       const newGuest = await prisma.guest.create({
          data: {
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            email: guestData.email,
            phone: guestData.phone,
          },
        })
        resolvedGuestId = newGuest.id
    }

    if (!resolvedGuestId) {
      return new NextResponse('Guest information is required', { status: 400 })
    }

    // 2. Validate availability (Basic check for overlapping reservations on requested tables)
    // In a real production app, this should be transactional and more robust.
    const overlapping = await prisma.reservationOnTable.findFirst({
      where: {
        tableId: { in: tableIds },
        reservation: {
          OR: [
            {
              startTime: { lt: new Date(endTime) },
              endTime: { gt: new Date(startTime) },
            },
          ],
        },
      },
    })

    if (overlapping) {
      return new NextResponse('One or more tables are already booked for this time slot.', { status: 409 })
    }

    // 3. Create Reservation
    const reservation = await prisma.reservation.create({
      data: {
        restaurantId,
        guestId: resolvedGuestId,
        partySize,
        reservationDate,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'CONFIRMED', // default for now
        tables: {
          create: tableIds.map((tid: string) => ({
            table: { connect: { id: tid } },
          })),
        },
      },
    })

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('[RESERVATIONS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
