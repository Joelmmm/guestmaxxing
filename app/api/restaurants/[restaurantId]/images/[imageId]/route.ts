import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import {
  getRestaurantImageById,
  deleteRestaurantImage,
  setCoverImage,
} from '@/lib/services/restaurant-images'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string; imageId: string }> }
) {
  try {
    const { imageId } = await params
    const image = await getRestaurantImageById(imageId)

    if (!image) {
      return new NextResponse('Image not found', { status: 404 })
    }

    return new NextResponse(image.data, {
      status: 200,
      headers: {
        'Content-Type': image.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[RESTAURANT_IMAGE_SERVE_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string; imageId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const { restaurantId, imageId } = await params
    const updatedImage = await setCoverImage(imageId, restaurantId)

    return NextResponse.json(updatedImage)
  } catch (error) {
    console.error('[RESTAURANT_IMAGE_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string; imageId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const { restaurantId, imageId } = await params
    await deleteRestaurantImage(imageId, restaurantId)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[RESTAURANT_IMAGE_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
