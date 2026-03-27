"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Plus, Table as TableIcon } from "@phosphor-icons/react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { tableSchema, type TableFormValues } from "@/lib/validations/table"

interface TableDialogProps {
  restaurantId: string
  diningAreas: { id: string; name: string }[]
  children?: React.ReactNode
  initialData?: {
    id: string
    name: string
    minCapacity: number
    maxCapacity: number
    diningAreaId: string
    isActive: boolean
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TableDialog({ 
  restaurantId,
  diningAreas,
  children,
  initialData,
  open: controlledOpen,
  onOpenChange: setControlledOpen
}: TableDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()

  const isControlled = controlledOpen !== undefined
  const currentOpen = isControlled ? controlledOpen : open
  const setCurrentOpen = isControlled ? setControlledOpen : setOpen

  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      minCapacity: initialData?.minCapacity || 2,
      maxCapacity: initialData?.maxCapacity || 4,
      diningAreaId: initialData?.diningAreaId || (diningAreas.length === 1 ? diningAreas[0].id : ""),
      isActive: initialData?.isActive ?? true,
    },
  }) as any

  // Reset form when initialData or diningAreas change
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        minCapacity: initialData.minCapacity,
        maxCapacity: initialData.maxCapacity,
        diningAreaId: initialData.diningAreaId,
        isActive: initialData.isActive,
      })
    } else if (diningAreas.length === 1 && !form.getValues("diningAreaId")) {
        form.setValue("diningAreaId", diningAreas[0].id)
    }
  }, [initialData, diningAreas, form])

  async function onSubmit(values: TableFormValues) {
    setIsLoading(true)
    try {
      const url = initialData 
        ? `/api/restaurants/${restaurantId}/tables/${initialData.id}` 
        : `/api/restaurants/${restaurantId}/tables`
      
      const method = initialData ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${initialData ? "update" : "create"} table`)
      }

      toast.success(`Table ${initialData ? "updated" : "created"} successfully`)
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
            Add Table
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <TableIcon className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>{initialData ? "Edit Table" : "Add Table"}</DialogTitle>
          </div>
          <DialogDescription>
            {initialData 
              ? "Update the configuration of your table." 
              : "Register a new table in one of your dining areas."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Table Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Table 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="diningAreaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dining Area</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an area" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {diningAreas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (initialData ? "Saving..." : "Creating...") : (initialData ? "Save Changes" : "Create Table")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
