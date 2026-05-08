import { NextRequest, NextResponse } from "next/server"
import { checkAvailability, getAvailableSlotsForDate } from "@/lib/availability"
import { availabilitySchema } from "@/lib/validations/availability"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const slug = searchParams.get("slug")
    const date = searchParams.get("date") || ""
    const partySize = parseInt(searchParams.get("partySize") || "1")
    const time = searchParams.get("time")
    
    if (!slug) {
      return NextResponse.json({ error: "Restaurant slug is required" }, { status: 400 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, timezone: true }
    })

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
    }

    // If time is provided, just check that specific time
    if (time) {
      const query = {
        restaurantId: restaurant.id,
        date,
        time,
        partySize,
      }

      const validation = availabilitySchema.safeParse(query)
      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid availability query parameters", details: validation.error.format() },
          { status: 400 }
        )
      }

      const result = await checkAvailability(validation.data)
      return NextResponse.json(result, { status: 200 })
    }

    // If NO time is provided, generate a list of available slots for the whole day
    const availableSlots = await getAvailableSlotsForDate({
      restaurantId: restaurant.id,
      date,
      partySize,
      restaurantTimezone: restaurant.timezone,
    })

    return NextResponse.json({ availableSlots }, { status: 200 })

  } catch (error) {
    console.error("[AVAILABILITY_PUBLIC_GET]", error)
    return NextResponse.json(
      { error: "Internal server error while checking availability" },
      { status: 500 }
    )
  }
}
