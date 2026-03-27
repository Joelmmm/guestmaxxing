import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateBody } from '@/lib/api-utils'
import { operatingHoursSchema, scheduleOverrideSchema } from '@/lib/validations/operating-hours'

interface OperatingHoursParams {
  params: Promise<{
    restaurantId: string
  }>
}

export async function GET(req: Request, { params }: OperatingHoursParams) {
  try {
    const { restaurantId } = await params
    const hours = await prisma.operatingHours.findMany({
      where: { restaurantId },
      include: { slots: true },
      orderBy: { dayOfWeek: 'asc' },
    })

    const overrides = await prisma.scheduleOverride.findMany({
      where: {
        restaurantId,
        date: {
          gte: new Date(), // Just current and future ones
        },
      },
      include: { slots: true },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({
      hours,
      overrides,
    })
  } catch (error) {
    console.error('[OPERATING_HOURS_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request, { params }: OperatingHoursParams) {
  try {
    const { restaurantId } = await params
    const body = await req.json()
    const { type, data } = body // type: 'HOURS' or 'OVERRIDE'

    if (type === 'HOURS') {
      const validation = validateBody(operatingHoursSchema, data)
      if (!validation.isValid) return validation.response

      const { dayOfWeek, slots } = validation.data

      // Check if already exists for this day
      const existing = await prisma.operatingHours.findUnique({
        where: {
          restaurantId_dayOfWeek: {
            restaurantId,
            dayOfWeek,
          },
        },
      })

      if (existing) {
        const hour = await prisma.operatingHours.update({
          where: { id: existing.id },
          data: {
            slots: {
              deleteMany: {},
              create: slots,
            },
          },
          include: { slots: true },
        })
        return NextResponse.json(hour)
      } else {
        const hour = await prisma.operatingHours.create({
          data: {
            restaurantId,
            dayOfWeek,
            slots: {
              create: slots,
            },
          },
          include: { slots: true },
        })
        return NextResponse.json(hour)
      }
    } else if (type === 'OVERRIDE') {
      const validation = validateBody(scheduleOverrideSchema, data)
      if (!validation.isValid) return validation.response

      const { date, isClosed, slots } = validation.data

      // Check if already exists for this date
      const existing = await prisma.scheduleOverride.findFirst({
        where: { 
          restaurantId, 
          date: {
            equals: date
          }
        },
      })

      if (existing) {
        const override = await prisma.scheduleOverride.update({
          where: { id: existing.id },
          data: {
            isClosed,
            slots: {
              deleteMany: {},
              create: isClosed ? [] : slots,
            },
          },
          include: { slots: true },
        })
        return NextResponse.json(override)
      } else {
        const override = await prisma.scheduleOverride.create({
          data: {
            restaurantId,
            date,
            isClosed,
            slots: {
              create: isClosed ? [] : slots,
            },
          },
          include: { slots: true },
        })
        return NextResponse.json(override)
      }
    }

    return new NextResponse('Invalid type', { status: 400 })
  } catch (error) {
    console.error('[OPERATING_HOURS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
