import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantAccess } from '@/lib/api-utils'
import { tableSchema } from '@/lib/validations/table'
import { validateBody } from '@/lib/api-utils'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params

    const access = await verifyRestaurantAccess(restaurantId);
    if (!access.isAuthorized) return access.response;

    const today = new Date()

    // Fetch dining areas with their tables and active reservations
    const diningAreas = await prisma.diningArea.findMany({
      where: {
        restaurantId,
      },
      include: {
        tables: {
          where: {
            isActive: true,
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
              include: {
                reservation: {
                  select: {
                    status: true,
                    partySize: true,
                  },
                },
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(diningAreas)
  } catch (error) {
    console.error('[RESTAURANT_TABLES_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params

    const access = await verifyRestaurantAccess(restaurantId, ['owner', 'admin']);
    if (!access.isAuthorized) return access.response;

    const body = await req.json()
    const validation = validateBody(tableSchema, body)

    if (!validation.isValid) {
      return validation.response
    }

    const { name, minCapacity, maxCapacity, diningAreaId, isActive } = validation.data

    // Verify dining area belongs to this restaurant
    const diningArea = await prisma.diningArea.findFirst({
      where: {
        id: diningAreaId,
        restaurantId,
      },
    })

    if (!diningArea) {
      return new NextResponse('Dining area not found in this restaurant', { status: 404 })
    }

    const table = await prisma.table.create({
      data: {
        name,
        minCapacity,
        maxCapacity,
        diningAreaId,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error('[TABLES_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
