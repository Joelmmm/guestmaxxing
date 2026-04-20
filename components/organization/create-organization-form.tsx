"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { organizationSchema, OrganizationFormValues } from "@/lib/validations/organization"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WarningCircle } from "@phosphor-icons/react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CreateOrganizationFormProps {
  onSuccess?: (organizationId: string) => void
  onCancel?: () => void
}

export function CreateOrganizationForm({ onSuccess, onCancel }: CreateOrganizationFormProps) {
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  })

  // Basic auto-slug logic
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setValue("name", newName, { shouldValidate: true })
    const generatedSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    setValue("slug", generatedSlug, { shouldValidate: true })
  }

  const onSubmit = async (data: OrganizationFormValues) => {
    setError(null)

    try {
      const { data: orgData, error: creationError } = await authClient.organization.create({
        name: data.name,
        slug: data.slug,
      })

      if (creationError) {
        setError(creationError.message || "Failed to create workspace")
        return
      }

      if (orgData && "id" in orgData && orgData.id) {
        onSuccess?.(orgData.id as string)
      }
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <WarningCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Workspace Name</Label>
        <Input
          id="name"
          placeholder="e.g. Bella Italia Group"
          {...register("name")}
          onChange={handleNameChange} // override onChange to auto-slug
        />
        {errors.name && (
          <p className="text-sm font-medium text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Workspace Slug</Label>
        <Input
          id="slug"
          {...register("slug")}
        />
        <p className="text-xs text-muted-foreground">
          This will be used for internal URLs and API references.
        </p>
        {errors.slug && (
          <p className="text-sm font-medium text-destructive">{errors.slug.message}</p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        {/* If no onCancel, push to the right */}
        <div className={!onCancel ? "w-full flex justify-end" : ""}>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Workspace"}
          </Button>
        </div>
      </div>
    </form>
  )
}
