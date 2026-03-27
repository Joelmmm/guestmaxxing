import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface DiningAreaDetailParams {
  params: Promise<{
    restaurantId: string
    areaId: string
  }>
}

export async function GET(req: Request, { params }: DiningAreaDetailParams) {
  try {
    const { restaurantId, areaId } = await params
    
    if (!areaId) {
      return new NextResponse('Dining area ID is required', { status: 400 })
    }

    const diningArea = await prisma.diningArea.findUnique({
      where: { id: areaId },
      include: {
        tables: true,
      },
    })

    if (!diningArea || diningArea.restaurantId !== restaurantId) {
      return new NextResponse('Dining area not found in this restaurant', { status: 404 })
    }

    return NextResponse.json(diningArea)
  } catch (error) {
    console.error('[DINING_AREA_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: DiningAreaDetailParams) {
  try {
    const { areaId } = await params
    
    if (!areaId) {
      return new NextResponse('Dining area ID is required', { status: 400 })
    }

    const body = await req.json()
    const { name, description, isActive } = body

    const diningArea = await prisma.diningArea.update({
      where: { id: areaId },
      data: {
        name,
        description,
        isActive,
      },
    })

    return NextResponse.json(diningArea)
  } catch (error) {
    console.error('[DINING_AREA_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: DiningAreaDetailParams) {
  try {
    const { areaId } = await params
    
    if (!areaId) {
      return new NextResponse('Dining area ID is required', { status: 400 })
    }

    const diningArea = await prisma.diningArea.delete({
      where: { id: areaId },
    })

    return NextResponse.json(diningArea)
  } catch (error) {
    console.error('[DINING_AREA_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
