import { prisma } from "@/lib/prisma"

const select = {
  id: true,
  restaurantId: true,
  mimeType: true,
  altText: true,
  isCover: true,
  createdAt: true,
  updatedAt: true,
}

export async function addRestaurantImage(params: {
  restaurantId: string
  data: Buffer | Uint8Array
  mimeType: string
  altText?: string
  isCover?: boolean
}) {
  const { restaurantId, data, mimeType, altText, isCover = false } = params

  return await prisma.$transaction(async (tx) => {
    if (isCover) {
      await tx.restaurantImage.updateMany({
        where: { restaurantId, isCover: true },
        data: { isCover: false },
      })
    }

    return await tx.restaurantImage.create({
      data: {
        restaurantId,
        data: new Uint8Array(data),
        mimeType,
        altText,
        isCover,
      },
      select,
    })
  })
}

export async function getRestaurantImages(restaurantId: string) {
  return await prisma.restaurantImage.findMany({
    where: { restaurantId },
    select,
    orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
  })
}

export async function getRestaurantImageById(
  imageId: string,
  restaurantId: string
) {
  return await prisma.restaurantImage.findFirst({
    where: { id: imageId, restaurantId },
  })
}

export async function deleteRestaurantImage(
  imageId: string,
  restaurantId: string
) {
  return await prisma.restaurantImage.delete({
    where: {
      id: imageId,
      restaurantId,
    },
  })
}

export async function setCoverImage(imageId: string, restaurantId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.restaurantImage.updateMany({
      where: { restaurantId, isCover: true },
      data: { isCover: false },
    })

    return await tx.restaurantImage.update({
      where: { id: imageId, restaurantId },
      data: { isCover: true },
      select,
    })
  })
}
