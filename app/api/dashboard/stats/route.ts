import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantDayBounds } from '@/lib/time-utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return new NextResponse('Restaurant ID is required', { status: 400 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { timezone: true }
    })

    if (!restaurant) {
      return new NextResponse('Restaurant not found', { status: 404 })
    }

    const { start, end } = getRestaurantDayBounds(restaurant.timezone)
    const today = new Date()

    const reservations = await prisma.reservation.findMany({
      where: {
        restaurantId,
        reservationDate: {
          gte: start,
          lte: end,
        },
      },
    })

    const stats = {
      total: reservations.length,
      confirmed: reservations.filter((r) => r.status === 'CONFIRMED').length,
      arrived: reservations.filter((r) => r.status === 'ARRIVED').length,
      seated: reservations.filter((r) => r.status === 'SEATED').length,
      completed: reservations.filter((r) => r.status === 'COMPLETED').length,
      cancelled: reservations.filter((r) => r.status === 'CANCELLED').length,
      noShow: reservations.filter((r) => r.status === 'NO_SHOW').length,
    }

    // Get table occupancy
    const tables = await prisma.table.findMany({
      where: {
        diningArea: {
          restaurantId,
        },
      },
      include: {
        reservations: {
          where: {
            reservation: {
              startTime: { lte: today },
              endTime: { gte: today },
              status: { in: ['ARRIVED', 'SEATED'] },
            },
          },
        },
      },
    })

    const occupancy = {
      total: tables.length,
      occupied: tables.filter((t) => t.reservations.length > 0).length,
    }

    return NextResponse.json({ stats, occupancy })
  } catch (error) {
    console.error('[DASHBOARD_STATS_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
