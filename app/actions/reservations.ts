"use server"

import { revalidatePath } from "next/cache"
import { createReservation, updateReservation, deleteReservation } from "@/lib/services/reservations"
import { ReservationFormValues, reservationSchema } from "@/lib/validations/reservation"
import { validateBody } from "@/lib/api-utils"

export async function createReservationAction(data: ReservationFormValues) {
  try {
    // We can run validation here too for extra safety on the Server Action layer
    const validation = validateBody(reservationSchema, data)
    if (!validation.isValid) {
      throw new Error("Validation failed")
    }

    const reservation = await createReservation(validation.data)
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/reservations')
    return { success: true, data: reservation }
  } catch (error: any) {
    console.error('[ACTION_CREATE_RESERVATION]', error)
    return { success: false, error: error.message || "Failed to create reservation" }
  }
}

export async function updateReservationAction(id: string, data: any) {
  try {
    const reservation = await updateReservation(id, data)
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/reservations')
    return { success: true, data: reservation }
  } catch (error: any) {
    console.error('[ACTION_UPDATE_RESERVATION]', error)
    return { success: false, error: error.message || "Failed to update reservation" }
  }
}

export async function deleteReservationAction(id: string) {
  try {
    const reservation = await deleteReservation(id)
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/reservations')
    return { success: true, data: reservation }
  } catch (error: any) {
    console.error('[ACTION_DELETE_RESERVATION]', error)
    return { success: false, error: error.message || "Failed to delete reservation" }
  }
}
