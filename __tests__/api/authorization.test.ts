import { beforeEach, describe, expect, test } from "vitest"
import {
  DELETE as deleteReservation,
  GET as getReservation,
  PATCH as patchReservation,
} from "@/app/api/reservations/[reservationId]/route"
import { POST as createReservation } from "@/app/api/reservations/route"
import {
  DELETE as deleteDiningArea,
  PATCH as patchDiningArea,
} from "@/app/api/restaurants/[restaurantId]/dining-areas/[areaId]/route"
import { DELETE as deleteTable } from "@/app/api/restaurants/[restaurantId]/tables/[tableId]/route"
import { POST as uploadImage } from "@/app/api/restaurants/[restaurantId]/images/route"
import {
  DELETE as deleteGuest,
  GET as getGuest,
  PATCH as patchGuest,
} from "@/app/api/guests/[guestId]/route"
import { GET as getGuests } from "@/app/api/guests/route"
import {
  deleteReservationAction,
  updateReservationAction,
} from "@/app/actions/reservations"
import { cancelReservationAction } from "@/app/(site)/manage/actions"
import { clearDatabase, prisma } from "@/__tests__/helpers/db"
import {
  seedDiningArea,
  seedGuest,
  seedReservation,
  seedRestaurant,
  seedTable,
} from "@/__tests__/helpers/seed"
import {
  mockUnauthenticatedSession,
  TEST_USER_ID,
} from "@/__tests__/helpers/auth"
import {
  buildDeleteRequest,
  buildGetRequest,
  buildPatchRequest,
  buildPostRequest,
  expectOk,
  expectStatus,
} from "@/__tests__/helpers/request"

const API_URL = "http://localhost:3000/api"

describe("authorization and tenant isolation", () => {
  beforeEach(clearDatabase)

  test("rejects unauthenticated reservation reads", async () => {
    const restaurant = await seedRestaurant()
    const guest = await seedGuest()
    const reservation = await seedReservation(restaurant.id, guest.id)
    mockUnauthenticatedSession()

    const response = await getReservation(
      buildGetRequest(`${API_URL}/reservations/${reservation.id}`),
      { params: Promise.resolve({ reservationId: reservation.id }) }
    )

    await expectStatus(response, 401)
  })

  test("prevents public callers from impersonating guests or assigning tables", async () => {
    const restaurant = await seedRestaurant()
    const area = await seedDiningArea(restaurant.id)
    const table = await seedTable(area.id)
    const guest = await seedGuest({ email: "protected-guest@example.com" })
    const basePayload = {
      restaurantId: restaurant.id,
      guestData: {
        firstName: "Public",
        lastName: "Guest",
        email: "public-guest@example.com",
        phone: "",
      },
      partySize: 2,
      reservationDate: "2026-10-12",
      startTime: "19:00",
      durationMins: 90,
    }
    mockUnauthenticatedSession()

    await expectStatus(
      await createReservation(
        buildPostRequest(`${API_URL}/reservations`, {
          ...basePayload,
          guestId: guest.id,
        })
      ),
      403
    )
    await expectStatus(
      await createReservation(
        buildPostRequest(`${API_URL}/reservations`, {
          ...basePayload,
          tableIds: [table.id],
        })
      ),
      403
    )
  })

  test("blocks reservation reads and mutations across organizations", async () => {
    await seedRestaurant()
    const otherRestaurant = await seedRestaurant({
      organizationId: "other-org-id",
      name: "Other Restaurant",
      slug: "other-restaurant",
      grantAccess: false,
    })
    const guest = await seedGuest({ email: "other-guest@example.com" })
    const reservation = await seedReservation(otherRestaurant.id, guest.id)
    const url = `${API_URL}/reservations/${reservation.id}`
    const params = {
      params: Promise.resolve({ reservationId: reservation.id }),
    }

    await expectStatus(await getReservation(buildGetRequest(url), params), 403)
    await expectStatus(
      await patchReservation(
        buildPatchRequest(url, { status: "CANCELLED" }),
        params
      ),
      403
    )
    await expectStatus(
      await deleteReservation(buildDeleteRequest(url), params),
      403
    )

    const persisted = await prisma.reservation.findUnique({
      where: { id: reservation.id },
    })
    expect(persisted?.status).toBe("CONFIRMED")
  })

  test("protects reservation Server Actions with the same tenant boundary", async () => {
    await seedRestaurant()
    const otherRestaurant = await seedRestaurant({
      organizationId: "other-org-id",
      name: "Other Restaurant",
      slug: "other-restaurant",
      grantAccess: false,
    })
    const guest = await seedGuest({ email: "action-guest@example.com" })
    const reservation = await seedReservation(otherRestaurant.id, guest.id)

    const updateResult = await updateReservationAction(reservation.id, {
      status: "CANCELLED",
    })
    const deleteResult = await deleteReservationAction(reservation.id)

    expect(updateResult.success).toBe(false)
    expect(deleteResult.success).toBe(false)
    expect(
      await prisma.reservation.findUnique({ where: { id: reservation.id } })
    ).not.toBeNull()
  })

  test("rejects table assignments from another restaurant", async () => {
    const restaurant = await seedRestaurant()
    const guest = await seedGuest({ email: "local-guest@example.com" })
    const reservation = await seedReservation(restaurant.id, guest.id)
    const otherRestaurant = await seedRestaurant({
      organizationId: "other-org-id",
      name: "Other Restaurant",
      slug: "other-restaurant",
      grantAccess: false,
    })
    const otherArea = await seedDiningArea(otherRestaurant.id)
    const otherTable = await seedTable(otherArea.id)
    const url = `${API_URL}/reservations/${reservation.id}`

    const response = await patchReservation(
      buildPatchRequest(url, { tableIds: [otherTable.id] }),
      { params: Promise.resolve({ reservationId: reservation.id }) }
    )

    await expectStatus(response, 400)
    expect(
      await prisma.reservationOnTable.findMany({
        where: { reservationId: reservation.id },
      })
    ).toHaveLength(0)
  })

  test("only lets a guest account cancel its own reservation", async () => {
    const restaurant = await seedRestaurant()
    const otherGuest = await seedGuest({ email: "unlinked@example.com" })
    const otherReservation = await seedReservation(restaurant.id, otherGuest.id)

    const rejected = await cancelReservationAction(otherReservation.id)
    expect(rejected.success).toBe(false)

    const ownedGuest = await seedGuest({ email: "owner@example.com" })
    await prisma.guest.update({
      where: { id: ownedGuest.id },
      data: { userId: TEST_USER_ID },
    })
    const ownedReservation = await seedReservation(restaurant.id, ownedGuest.id)

    const accepted = await cancelReservationAction(ownedReservation.id)
    expect(accepted.success).toBe(true)
    expect(
      await prisma.reservation.findUnique({
        where: { id: ownedReservation.id },
      })
    ).toMatchObject({ status: "CANCELLED" })
  })

  test("scopes guest reads and mutations to the requested restaurant", async () => {
    const restaurant = await seedRestaurant()
    const otherRestaurant = await seedRestaurant({
      organizationId: "other-org-id",
      name: "Other Restaurant",
      slug: "other-restaurant",
      grantAccess: false,
    })
    const otherGuest = await seedGuest({ email: "private@example.com" })
    await seedReservation(otherRestaurant.id, otherGuest.id)

    const listResponse = await getGuests(
      buildGetRequest(`${API_URL}/guests?restaurantId=${restaurant.id}`)
    )
    expect(await expectOk<unknown[]>(listResponse)).toHaveLength(0)

    const detailUrl = `${API_URL}/guests/${otherGuest.id}?restaurantId=${restaurant.id}`
    const params = { params: Promise.resolve({ guestId: otherGuest.id }) }
    await expectStatus(await getGuest(buildGetRequest(detailUrl), params), 404)
    await expectStatus(
      await patchGuest(
        buildPatchRequest(detailUrl, {
          firstName: "Changed",
          lastName: "Guest",
          email: "private@example.com",
        }),
        params
      ),
      404
    )
    await expectStatus(
      await deleteGuest(buildDeleteRequest(detailUrl), params),
      404
    )
  })

  test("does not mutate nested resources from another restaurant", async () => {
    const restaurant = await seedRestaurant()
    const otherRestaurant = await seedRestaurant({
      organizationId: "other-org-id",
      name: "Other Restaurant",
      slug: "other-restaurant",
      grantAccess: false,
    })
    const otherArea = await seedDiningArea(otherRestaurant.id)
    const otherTable = await seedTable(otherArea.id)

    const areaUrl = `${API_URL}/restaurants/${restaurant.id}/dining-areas/${otherArea.id}`
    const areaParams = {
      params: Promise.resolve({
        restaurantId: restaurant.id,
        areaId: otherArea.id,
      }),
    }
    await expectStatus(
      await patchDiningArea(
        buildPatchRequest(areaUrl, { name: "Hijacked" }),
        areaParams
      ),
      404
    )
    await expectStatus(
      await deleteDiningArea(buildDeleteRequest(areaUrl), areaParams),
      404
    )

    const tableUrl = `${API_URL}/restaurants/${restaurant.id}/tables/${otherTable.id}`
    await expectStatus(
      await deleteTable(buildDeleteRequest(tableUrl), {
        params: Promise.resolve({
          restaurantId: restaurant.id,
          tableId: otherTable.id,
        }),
      }),
      404
    )

    expect(
      await prisma.diningArea.findUnique({ where: { id: otherArea.id } })
    ).not.toBeNull()
    expect(
      await prisma.table.findUnique({ where: { id: otherTable.id } })
    ).not.toBeNull()
  })

  test("requires organization membership before uploading restaurant images", async () => {
    const otherRestaurant = await seedRestaurant({
      organizationId: "other-org-id",
      name: "Other Restaurant",
      slug: "other-restaurant",
      grantAccess: false,
    })
    const url = `${API_URL}/restaurants/${otherRestaurant.id}/images`

    const response = await uploadImage(buildPostRequest(url, {}), {
      params: Promise.resolve({ restaurantId: otherRestaurant.id }),
    })

    await expectStatus(response, 403)
  })
})
