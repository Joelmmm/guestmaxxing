import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface GuestDetailParams {
  params: Promise<{
    guestId: string
  }>
}

export async function GET(req: Request, { params }: GuestDetailParams) {
  try {
    const { guestId } = await params
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        reservations: {
          take: 5,
          orderBy: { reservationDate: 'desc' },
          include: {
            restaurant: {
              select: { name: true },
            },
          },
        },
      },
    })

    if (!guest) {
      return new NextResponse('Guest not found', { status: 404 })
    }

    return NextResponse.json(guest)
  } catch (error) {
    console.error('[GUEST_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: GuestDetailParams) {
  try {
    const { guestId } = await params
    const body = await req.json()
    const { firstName, lastName, email, phone, notes } = body

    const guest = await prisma.guest.update({
      where: { id: guestId },
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
    console.error('[GUEST_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: GuestDetailParams) {
  try {
    const { guestId } = await params
    const guest = await prisma.guest.delete({
      where: { id: guestId },
    })

    return NextResponse.json(guest)
  } catch (error) {
    console.error('[GUEST_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
