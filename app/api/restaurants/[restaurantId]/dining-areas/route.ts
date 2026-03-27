import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { diningAreaSchema } from '@/lib/validations/dining-area'
import { validateBody } from '@/lib/api-utils'

interface DiningAreaParams {
  params: Promise<{
    restaurantId: string
  }>
}

export async function GET(req: Request, { params }: DiningAreaParams) {
  try {
    const { restaurantId } = await params
    
    if (!restaurantId) {
      return new NextResponse('Restaurant ID is required', { status: 400 })
    }

    const diningAreas = await prisma.diningArea.findMany({
      where: { restaurantId },
      include: {
        _count: {
          select: {
            tables: true,
          },
        },
      },
    })

    return NextResponse.json(diningAreas)
  } catch (error) {
    console.error('[DINING_AREAS_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request, { params }: DiningAreaParams) {
  try {
    const { restaurantId } = await params

    if (!restaurantId) {
      return new NextResponse('Restaurant ID is required', { status: 400 })
    }

    const body = await req.json()
    const validation = validateBody(diningAreaSchema, body)

    if (!validation.isValid) {
      return validation.response
    }

    const { name, description } = validation.data

    const diningArea = await prisma.diningArea.create({
      data: {
        name,
        description,
        restaurantId,
      },
    })

    return NextResponse.json(diningArea)
  } catch (error) {
    console.error('[DINING_AREAS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
