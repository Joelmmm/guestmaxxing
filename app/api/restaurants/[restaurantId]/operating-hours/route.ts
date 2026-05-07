import { NextResponse } from 'next/server'
import { verifyRestaurantAccess, validateBody } from '@/lib/api-utils'
import { operatingHoursSchema, scheduleOverrideSchema, operatingHoursPayloadSchema } from '@/lib/validations/operating-hours'
import {
  getSchedule,
  upsertOperatingHours,
  upsertScheduleOverride,
  saveScheduleBatch,
} from '@/lib/services/operating-hours'
import * as z from 'zod'

interface OperatingHoursParams {
  params: Promise<{ restaurantId: string }>
}

export async function GET(_req: Request, { params }: OperatingHoursParams) {
  try {
    const { restaurantId } = await params

    const access = await verifyRestaurantAccess(restaurantId)
    if (!access.isAuthorized) return access.response

    const schedule = await getSchedule(restaurantId)
    return NextResponse.json(schedule)
  } catch (error) {
    console.error('[OPERATING_HOURS_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request, { params }: OperatingHoursParams) {
  try {
    const { restaurantId } = await params

    const access = await verifyRestaurantAccess(restaurantId, ['owner', 'admin'])
    if (!access.isAuthorized) return access.response

    const body = await req.json()
    const validation = validateBody(operatingHoursPayloadSchema, body)
    if (!validation.isValid) return validation.response

    const payload = validation.data

    // ── Single operating-hours upsert ─────────────────────────────────────
    if (payload.type === 'HOURS') {
      const result = await upsertOperatingHours(restaurantId, payload.data)
      return NextResponse.json(result)
    }

    // ── Single schedule-override upsert ───────────────────────────────────
    if (payload.type === 'OVERRIDE') {
      const result = await upsertScheduleOverride(restaurantId, payload.data)
      return NextResponse.json(result)
    }

    // ── Full schedule batch save ───────────────────────────────────────────
    if (payload.type === 'SCHEDULE_BATCH') {
      const result = await saveScheduleBatch(
        restaurantId,
        payload.data.hours,
        payload.data.overrides
      )
      return NextResponse.json(result)
    }

    return new NextResponse('Invalid type', { status: 400 })
  } catch (error) {
    console.error('[OPERATING_HOURS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
