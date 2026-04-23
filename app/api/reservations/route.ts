import { NextResponse } from 'next/server'
import { reservationSchema } from '@/lib/validations/reservation'
import { validateBody, verifyRestaurantAccess } from '@/lib/api-utils'
import { getReservations, createReservation } from '@/lib/services/reservations'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return new NextResponse('Restaurant ID is required', { status: 400 })
    }

    const access = await verifyRestaurantAccess(restaurantId);
    if (!access.isAuthorized) return access.response;

    const date = searchParams.get('date') ?? undefined // YYYY-MM-DD
    const status = searchParams.get('status') ?? undefined

    const reservations = await getReservations(restaurantId, date, status)

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

    const reservation = await createReservation(validation.data)

    return NextResponse.json(reservation)
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message === 'RESTAURANT_NOT_FOUND') {
        return new NextResponse('Restaurant not found', { status: 404 })
      }
      if (error.message === 'PAST_RESERVATION') {
        return new NextResponse('Cannot make a reservation in the past', { status: 400 })
      }
      if (error.message === 'GUEST_INFO_REQUIRED') {
        return new NextResponse('Guest information is required', { status: 400 })
      }
      if (error.message === 'SPECIFIC_TABLES_BOOKED') {
        return new NextResponse('One or more specific tables are already booked for this time slot.', { status: 409 })
      }
      if (error.message === 'NO_TABLES_AVAILABLE') {
        return new NextResponse('No tables available for this party size at the requested time.', { status: 409 })
      }
      if (error.message === 'CONCURRENT_BOOKING_FAILED') {
        return new NextResponse('Transaction failed due to a concurrent booking. Please try again.', { status: 409 })
      }
    }

    console.error('[RESERVATIONS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
