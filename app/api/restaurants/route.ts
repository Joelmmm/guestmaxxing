import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { restaurantSchema } from '@/lib/validations/restaurant'
import { validateBody } from '@/lib/api-utils'
import { slugify } from '@/lib/utils'

export async function GET() {
  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            diningAreas: true,
            reservations: true,
          },
        },
      },
    })
    return NextResponse.json(restaurants)
  } catch (error) {
    console.error('[RESTAURANTS_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = validateBody(restaurantSchema, body)

    if (!validation.isValid) {
      return validation.response
    }

    const { name, timezone, contactEmail, contactPhone } = validation.data

    let slug = slugify(name)

    // Uniqueness check: if slug exists, append numeric suffix
    let count = 0
    let existingSlug = await prisma.restaurant.findUnique({ where: { slug } })

    while (existingSlug) {
      count++
      const newSlug = `${slug}-${count}`
      existingSlug = await prisma.restaurant.findUnique({ where: { slug: newSlug } })
      if (!existingSlug) slug = newSlug
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        timezone: timezone || 'America/Santiago',
        contactEmail: contactEmail,
        contactPhone: contactPhone || undefined,
      },
    })

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error('[RESTAURANTS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
