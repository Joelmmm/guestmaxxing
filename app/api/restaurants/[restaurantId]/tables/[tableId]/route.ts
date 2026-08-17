import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyRestaurantAccess } from "@/lib/api-utils"

interface TableDetailParams {
  params: Promise<{
    restaurantId: string
    tableId: string
  }>
}

export async function GET(req: Request, { params }: TableDetailParams) {
  try {
    const { restaurantId, tableId } = await params

    const access = await verifyRestaurantAccess(
      restaurantId,
      ["owner", "admin", "member"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        diningArea: true,
      },
    })

    if (!table || table.diningArea.restaurantId !== restaurantId) {
      return new NextResponse("Table not found in this restaurant", {
        status: 404,
      })
    }

    return NextResponse.json(table)
  } catch (error) {
    console.error("[TABLE_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: TableDetailParams) {
  try {
    const { restaurantId, tableId } = await params

    const access = await verifyRestaurantAccess(
      restaurantId,
      ["owner", "admin"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const body = await req.json()
    const { name, minCapacity, maxCapacity, isActive, diningAreaId } = body

    const existingTable = await prisma.table.findFirst({
      where: { id: tableId, diningArea: { restaurantId } },
      select: { id: true },
    })

    if (!existingTable) {
      return new NextResponse("Table not found in this restaurant", {
        status: 404,
      })
    }

    if (diningAreaId) {
      const destinationArea = await prisma.diningArea.findFirst({
        where: { id: diningAreaId, restaurantId },
        select: { id: true },
      })

      if (!destinationArea) {
        return new NextResponse("Dining area not found in this restaurant", {
          status: 404,
        })
      }
    }

    const table = await prisma.table.update({
      where: { id: tableId },
      data: {
        name,
        minCapacity: minCapacity ? parseInt(minCapacity) : undefined,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
        isActive,
        diningAreaId,
      },
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error("[TABLE_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: TableDetailParams) {
  try {
    const { restaurantId, tableId } = await params

    const access = await verifyRestaurantAccess(
      restaurantId,
      ["owner", "admin"],
      req.headers
    )
    if (!access.isAuthorized) return access.response

    const existingTable = await prisma.table.findFirst({
      where: { id: tableId, diningArea: { restaurantId } },
      select: { id: true },
    })

    if (!existingTable) {
      return new NextResponse("Table not found in this restaurant", {
        status: 404,
      })
    }

    const table = await prisma.table.delete({
      where: { id: tableId },
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error("[TABLE_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
