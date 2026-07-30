import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { addRestaurantImage, getRestaurantImages } from '@/lib/services/restaurant-images'
import { restaurantImageSchema } from '@/lib/validations/restaurant-image'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB limit per image to keep database size under control

export async function GET(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params
    const images = await getRestaurantImages(restaurantId)
    return NextResponse.json(images)
  } catch (error) {
    console.error('[RESTAURANT_IMAGES_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const { restaurantId } = await params
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return new NextResponse('File is required', { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse('File size exceeds the maximum allowed size of 2MB', { status: 400 })
    }

    const altText = (formData.get('altText') as string) || undefined
    const isCover = formData.get('isCover') === 'true'

    const validation = restaurantImageSchema.safeParse({ altText, isCover })
    if (!validation.success) {
      return NextResponse.json(validation.error.flatten().fieldErrors, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const image = await addRestaurantImage({
      restaurantId,
      data: buffer,
      mimeType: file.type || 'image/jpeg',
      altText: validation.data.altText,
      isCover: validation.data.isCover,
    })

    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    console.error('[RESTAURANT_IMAGES_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
