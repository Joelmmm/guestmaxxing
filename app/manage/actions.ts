"use server"

import { revalidatePath } from "next/cache"
import { updateReservation } from "@/lib/services/reservations"

export async function cancelReservationAction(reservationId: string) {
  try {
    await updateReservation(reservationId, { status: "CANCELLED" })
    revalidatePath("/manage")
    return { success: true }
  } catch (error: any) {
    console.error("[CANCEL_RESERVATION_ACTION]", error)
    return { success: false, error: error.message || "Failed to cancel reservation" }
  }
}
