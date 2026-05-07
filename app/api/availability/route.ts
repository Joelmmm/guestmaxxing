import { NextRequest, NextResponse } from "next/server"
import { checkAvailability } from "@/lib/availability"
import { availabilitySchema } from "@/lib/validations/availability"
import { verifyRestaurantAccess } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    
    // Extract query parameters
    const query = {
      restaurantId: searchParams.get("restaurantId") || "",
      date: searchParams.get("date") || "",
      time: searchParams.get("time") || "",
      partySize: searchParams.get("partySize") || "",
    }

    // Validate using the schema
    const validation = availabilitySchema.safeParse(query)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid availability query parameters", details: validation.error.format() },
        { status: 400 }
      )
    }

    const access = await verifyRestaurantAccess(validation.data.restaurantId);
    if (!access.isAuthorized) return access.response as NextResponse;

    // Run the engine
    const result = await checkAvailability(validation.data)

    // Respond based on result
    if (!result.available) {
      return NextResponse.json(
        { available: false, reason: result.reason },
        { status: 404 }
      )
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[AVAILABILITY_GET]", error)
    return NextResponse.json(
      { error: "Internal server error while checking availability" },
      { status: 500 }
    )
  }
}
