import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantAccess } from '@/lib/api-utils'

interface RestaurantParams {
  params: Promise<{
    restaurantId: string
  }>
}

export async function GET(req: Request, { params }: RestaurantParams) {
  try {
    const { restaurantId } = await params

    if (!restaurantId) {
      return new NextResponse('Restaurant ID is required', { status: 400 })
    }

    const access = await verifyRestaurantAccess(restaurantId);
    if (!access.isAuthorized) return access.response;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        diningAreas: true,
        operatingHours: true,
        scheduleOverrides: true,
      },
    })

    if (!restaurant) {
      return new NextResponse('Restaurant not found', { status: 404 })
    }

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error('[RESTAURANT_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

import { validateBody } from '@/lib/api-utils'
import { restaurantSchema } from '@/lib/validations/restaurant'

export async function PATCH(req: Request, { params }: RestaurantParams) {
  try {
    const { restaurantId } = await params

    if (!restaurantId) {
      return new NextResponse('Restaurant ID is required', { status: 400 })
    }

    const access = await verifyRestaurantAccess(restaurantId, ['owner', 'admin']);
    if (!access.isAuthorized) return access.response;

    const body = await req.json()
    const validation = validateBody(restaurantSchema, body)
    
    if (!validation.isValid) {
      return validation.response
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: validation.data,
    })

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error('[RESTAURANT_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: RestaurantParams) {
  try {
    const { restaurantId } = await params

    if (!restaurantId) {
      return new NextResponse('Restaurant ID is required', { status: 400 })
    }

    const access = await verifyRestaurantAccess(restaurantId, ['owner']);
    if (!access.isAuthorized) return access.response;

    // Checking if it exists first
    const existing = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })

    if (!existing) {
      return new NextResponse('Restaurant not found', { status: 404 })
    }

    const restaurant = await prisma.restaurant.delete({
      where: { id: restaurantId },
    })

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error('[RESTAURANT_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
