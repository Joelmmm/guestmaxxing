import { prisma } from "../lib/prisma"

async function main() {
  const r = await prisma.restaurant.findFirst({
    include: {
      images: {
        select: {
          id: true
        }
      }
    }
  })
  console.log(r)
}

main().catch(console.error)
