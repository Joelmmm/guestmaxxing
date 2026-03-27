import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { restaurantSchema } from '@/lib/validations/restaurant'
import { validateBody } from '@/lib/api-utils'

export async function GET() {
  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
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
    console.error('[RESTAURANTS_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = validateBody(restaurantSchema, body)

    if (!validation.isValid) {
      return validation.response
    }

    const { name, timezone, contactEmail, contactPhone } = validation.data

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        timezone: timezone || 'America/Santiago',
        contactEmail,
        contactPhone,
      },
    })

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error('[RESTAURANTS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
