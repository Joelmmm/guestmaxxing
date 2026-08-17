import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyRestaurantAccess } from "@/lib/api-utils"

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
      return new NextResponse("Dining area ID is required", { status: 400 })
    }

    const access = await verifyRestaurantAccess(
      restaurantId,
      ["owner", "admin", "member"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const diningArea = await prisma.diningArea.findUnique({
      where: { id: areaId },
      include: {
        tables: true,
      },
    })

    if (!diningArea || diningArea.restaurantId !== restaurantId) {
      return new NextResponse("Dining area not found in this restaurant", {
        status: 404,
      })
    }

    return NextResponse.json(diningArea)
  } catch (error) {
    console.error("[DINING_AREA_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: DiningAreaDetailParams) {
  try {
    const { restaurantId, areaId } = await params

    if (!areaId) {
      return new NextResponse("Dining area ID is required", { status: 400 })
    }

    const access = await verifyRestaurantAccess(
      restaurantId,
      ["owner", "admin"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const body = await req.json()
    const { name, description, isActive } = body

    const existingDiningArea = await prisma.diningArea.findFirst({
      where: { id: areaId, restaurantId },
      select: { id: true },
    })

    if (!existingDiningArea) {
      return new NextResponse("Dining area not found in this restaurant", {
        status: 404,
      })
    }

    const diningArea = await prisma.diningArea.update({
      where: { id: areaId, restaurantId },
      data: {
        name,
        description,
        isActive,
      },
    })

    return NextResponse.json(diningArea)
  } catch (error) {
    console.error("[DINING_AREA_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: DiningAreaDetailParams) {
  try {
    const { restaurantId, areaId } = await params

    if (!areaId) {
      return new NextResponse("Dining area ID is required", { status: 400 })
    }

    const access = await verifyRestaurantAccess(
      restaurantId,
      ["owner", "admin"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const existingDiningArea = await prisma.diningArea.findFirst({
      where: { id: areaId, restaurantId },
      select: { id: true },
    })

    if (!existingDiningArea) {
      return new NextResponse("Dining area not found in this restaurant", {
        status: 404,
      })
    }

    const diningArea = await prisma.diningArea.delete({
      where: { id: areaId, restaurantId },
    })

    return NextResponse.json(diningArea)
  } catch (error) {
    console.error("[DINING_AREA_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
