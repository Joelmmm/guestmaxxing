"use server"

import { revalidatePath } from "next/cache"
import {
  createReservation,
  updateReservation,
  deleteReservation,
} from "@/lib/services/reservations"
import {
  ReservationFormValues,
  reservationSchema,
} from "@/lib/validations/reservation"
import {
  validateBody,
  verifyReservationAccess,
  verifyRestaurantAccess,
} from "@/lib/api-utils"
import type { UpdateReservationInput } from "@/lib/services/reservations"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function getAuthorizationError(response: Response) {
  const payload = (await response.json()) as { error?: string }
  return payload.error || "You are not authorized to perform this action"
}

export async function createReservationAction(data: ReservationFormValues) {
  try {
    // We can run validation here too for extra safety on the Server Action layer
    const validation = validateBody(reservationSchema, data)
    if (!validation.isValid) {
      throw new Error("Validation failed")
    }

    const access = await verifyRestaurantAccess(validation.data.restaurantId, [
      "owner",
      "admin",
      "member",
    ])
    if (!access.isAuthorized) {
      return {
        success: false,
        error: await getAuthorizationError(access.response),
      }
    }

    const reservation = await createReservation(validation.data, true)
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/reservations")
    return { success: true, data: reservation }
  } catch (error: unknown) {
    console.error("[ACTION_CREATE_RESERVATION]", error)
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create reservation"),
    }
  }
}

export async function updateReservationAction(
  id: string,
  data: UpdateReservationInput
) {
  try {
    const access = await verifyReservationAccess(id)
    if (!access.isAuthorized) {
      return {
        success: false,
        error: await getAuthorizationError(access.response),
      }
    }

    const reservation = await updateReservation(id, data)
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/reservations")
    return { success: true, data: reservation }
  } catch (error: unknown) {
    console.error("[ACTION_UPDATE_RESERVATION]", error)
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update reservation"),
    }
  }
}

export async function deleteReservationAction(id: string) {
  try {
    const access = await verifyReservationAccess(id)
    if (!access.isAuthorized) {
      return {
        success: false,
        error: await getAuthorizationError(access.response),
      }
    }

    const reservation = await deleteReservation(id)
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/reservations")
    return { success: true, data: reservation }
  } catch (error: unknown) {
    console.error("[ACTION_DELETE_RESERVATION]", error)
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete reservation"),
    }
  }
}
