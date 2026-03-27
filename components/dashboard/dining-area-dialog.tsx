"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Plus, Layout } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { diningAreaSchema, type DiningAreaFormValues } from "@/lib/validations/dining-area"

interface DiningAreaDialogProps {
  restaurantId: string
  children?: React.ReactNode
  initialData?: {
    id: string
    name: string
    description?: string | null
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DiningAreaDialog({
  restaurantId,
  children,
  initialData,
  open: controlledOpen,
  onOpenChange: setControlledOpen
}: DiningAreaDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()

  const isControlled = controlledOpen !== undefined
  const currentOpen = isControlled ? controlledOpen : open
  const setCurrentOpen = isControlled ? setControlledOpen : setOpen

  const form = useForm<DiningAreaFormValues>({
    resolver: zodResolver(diningAreaSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
    },
  })

  // Reset form when initialData changes
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
      })
    }
  }, [initialData, form])

  async function onSubmit(values: DiningAreaFormValues) {
    setIsLoading(true)
    try {
      const url = initialData
        ? `/api/restaurants/${restaurantId}/dining-areas/${initialData.id}`
        : `/api/restaurants/${restaurantId}/dining-areas`

      const method = initialData ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${initialData ? "update" : "create"} dining area`)
      }

      toast.success(`Dining area ${initialData ? "updated" : "created"} successfully`)
      setCurrentOpen?.(false)
      if (!initialData) form.reset()
      router.refresh()
    } catch (error) {
      toast.error("Something went wrong. Please try again.")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={currentOpen} onOpenChange={setCurrentOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Dining Area
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Layout className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>{initialData ? "Edit Dining Area" : "Add Dining Area"}</DialogTitle>
          </div>
          <DialogDescription>
            {initialData
              ? "Update the details of your dining area."
              : "Create a new dining area (e.g., Main Hall, Patio, Rooftop)."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Dining Room" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Indoor seating near the bar" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional details about the area.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (initialData ? "Saving..." : "Creating...") : (initialData ? "Save Changes" : "Create Area")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
