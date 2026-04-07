import { NextRequest, NextResponse } from "next/server"
import { checkAvailability } from "@/lib/availability"
import { availabilitySchema } from "@/lib/validations/availability"
import { prisma } from "@/lib/prisma"
import { timeToMinutes, addMinutesToDate, getTurnTime } from "@/lib/schedule-utils"
import { parseDateStr, toRestaurantUtcDate } from "@/lib/time-utils"

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
      include: {
        operatingHours: {
          include: { slots: true }
        },
        scheduleOverrides: {
          where: { date: parseDateStr(date) },
          include: { slots: true }
        }
      }
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
    // We'll increment by 15 or 30 minutes depending on the turn time
    const slotsResponse = []
    
    // Determine which slots to use (prioritize overrides)
    const activeSlots = restaurant.scheduleOverrides[0]?.slots || 
                       restaurant.operatingHours.find(oh => oh.dayOfWeek === new Date(`${date}T00:00:00.000Z`).getUTCDay())?.slots || 
                       []

    for (const slot of activeSlots) {
      let currentMins = timeToMinutes(slot.openTime)
      const endMins = timeToMinutes(slot.closeTime)
      
      while (currentMins + 60 <= endMins) { // Assuming min 60 mins duration or similar
        const timeStr = `${Math.floor(currentMins / 60).toString().padStart(2, '0')}:${(currentMins % 60).toString().padStart(2, '0')}`
        
        const result = await checkAvailability({
          restaurantId: restaurant.id,
          date,
          time: timeStr,
          partySize,
        })
        
        if (result.available) {
          const startUtc = toRestaurantUtcDate(date, timeStr, restaurant.timezone)
          const startTime = startUtc.toISOString()
          const endTime = addMinutesToDate(startUtc, getTurnTime(partySize)).toISOString()
          slotsResponse.push({ startTime, endTime })
        }
        
        currentMins += 30 // Check every 30 minutes
      }
    }

    return NextResponse.json({ available: slotsResponse.length > 0, slots: slotsResponse }, { status: 200 })

  } catch (error) {
    console.error("[AVAILABILITY_PUBLIC_GET]", error)
    return NextResponse.json(
      { error: "Internal server error while checking availability" },
      { status: 500 }
    )
  }
}
