"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ImageSquare,
  UploadSimple,
  Trash,
  Star,
  FileImage,
} from "@phosphor-icons/react"

import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { cn } from "@/lib/utils"

type ImageMeta = {
  id: string
  mimeType: string
  altText: string | null
  isCover: boolean
}

interface RestaurantImagesSectionProps {
  restaurantId: string
  initialImages: ImageMeta[]
  canManage: boolean
}

export function RestaurantImagesSection({
  restaurantId,
  initialImages,
  canManage,
}: RestaurantImagesSectionProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    // Validate file size (< 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB")
      return
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image")
      return
    }

    setIsUploading(true)

    const formData = new FormData()
    formData.append("file", file)

    // If it's the first image, make it the cover
    if (initialImages.length === 0) {
      formData.append("isCover", "true")
    }

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/images`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      toast.success("Image uploaded successfully")
      router.refresh()
    } catch (error) {
      toast.error("Failed to upload image")
      console.error(error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return

    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/images/${imageId}`,
        {
          method: "DELETE",
        }
      )

      if (!res.ok) throw new Error("Failed to delete image")

      toast.success("Image deleted")
      router.refresh()
    } catch (error) {
      toast.error("Failed to delete image")
      console.error(error)
    }
  }

  const handleSetCover = async (imageId: string) => {
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/images/${imageId}`,
        {
          method: "PATCH",
        }
      )

      if (!res.ok) throw new Error("Failed to update cover image")

      toast.success("Cover image updated")
      router.refresh()
    } catch (error) {
      toast.error("Failed to update cover image")
      console.error(error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <ImageSquare size={24} weight="duotone" className="text-primary" />
            Restaurant Images
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage photos of your venue. The cover photo is displayed on your
            booking page.
          </p>
        </div>
        {canManage && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadSimple size={16} weight="bold" data-icon="inline-start" />
              {isUploading ? "Uploading..." : "Upload Image"}
            </Button>
          </div>
        )}
      </div>

      {initialImages.length === 0 && !isUploading ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
          <FileImage
            size={40}
            className="mx-auto mb-4 text-muted-foreground"
            weight="duotone"
          />
          <p className="text-sm font-medium">No images uploaded yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a photo to show off your restaurant.
          </p>
        </div>
      ) : (
        <AttachmentGroup className="w-full">
          {/* Uploading Placeholder */}
          {isUploading && (
            <Attachment state="uploading" orientation="vertical">
              <AttachmentMedia variant="icon" />
              <AttachmentContent>
                <AttachmentTitle>Uploading...</AttachmentTitle>
                <AttachmentDescription>Processing image</AttachmentDescription>
              </AttachmentContent>
            </Attachment>
          )}

          {/* Uploaded Images */}
          {initialImages.map((image) => (
            <Attachment key={image.id} state="done" orientation="vertical">
              <AttachmentMedia variant="image">
                {/* We stream the image directly from our API */}
                <Image
                  src={`/api/restaurants/${restaurantId}/images/${image.id}`}
                  alt={image.altText || "Restaurant Image"}
                  fill
                  style={{ objectFit: "cover" }}
                />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>
                  {image.isCover ? "Cover Image" : "Image"}
                </AttachmentTitle>

                {image.altText || (
                  <AttachmentDescription>{image.altText}</AttachmentDescription>
                )}
              </AttachmentContent>
              {canManage && (
                <AttachmentActions>
                  <AttachmentAction
                    variant="ghost"
                    onClick={() => !image.isCover ? handleSetCover(image.id) : null}
                    title="Set as Cover"
                  >
                    <Star weight="fill" className={cn(image.isCover ? "text-yellow-400" : "text-muted-foreground")} />
                  </AttachmentAction>

                  <AttachmentAction
                    variant="destructive"
                    onClick={() => handleDelete(image.id)}
                    title="Delete Image"
                  >
                    <Trash weight="bold" />
                  </AttachmentAction>
                </AttachmentActions>
              )}
            </Attachment>
          ))}
        </AttachmentGroup>
      )}
    </div>
  )
}
