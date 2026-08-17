"use server"

import { revalidatePath } from "next/cache"
import { updateReservation } from "@/lib/services/reservations"
import { verifyGuestReservationOwnership } from "@/lib/api-utils"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export async function cancelReservationAction(reservationId: string) {
  try {
    const access = await verifyGuestReservationOwnership(reservationId)
    if (!access.isAuthorized) {
      const payload = (await access.response.json()) as { error?: string }
      return {
        success: false,
        error: payload.error || "You cannot cancel this reservation",
      }
    }

    await updateReservation(reservationId, { status: "CANCELLED" })
    revalidatePath("/manage")
    return { success: true }
  } catch (error: unknown) {
    console.error("[CANCEL_RESERVATION_ACTION]", error)
    return {
      success: false,
      error: getErrorMessage(error, "Failed to cancel reservation"),
    }
  }
}
