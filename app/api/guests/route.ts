import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guestSchema } from '@/lib/validations/guest'
import { validateBody } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    const where: any = {}

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
      ]
    }

    const guests = await prisma.guest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query ? 50 : 20, // Limit for better performance
    })

    return NextResponse.json(guests)
  } catch (error) {
    console.error('[GUESTS_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = validateBody(guestSchema, body)

    if (!validation.isValid) {
      return validation.response
    }

    const { firstName, lastName, email, phone, notes } = validation.data

    const guest = await prisma.guest.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        notes,
      },
    })

    return NextResponse.json(guest)
  } catch (error) {
    console.error('[GUESTS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
