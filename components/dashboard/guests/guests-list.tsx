"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { 
  DotsThreeVertical, 
  PencilSimple, 
  Trash, 
  Phone, 
  Envelope, 
  Calendar,
  Note,
  CaretLeft,
  CaretRight
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { formatInTimeZone } from "date-fns-tz"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { GuestDialog } from "./guest-dialog"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"

import type { Prisma, Guest } from "@/generated/client"

export type GuestWithCount = Prisma.GuestGetPayload<{
  include: {
    _count: {
      select: {
        reservations: true
      }
    }
  }
}>

interface GuestsListProps {
  guests: GuestWithCount[]
  totalPages: number
  currentPage: number
}

export function GuestsList({ guests, totalPages, currentPage }: GuestsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isDeleting, setIsDeleting] = React.useState(false)
  const [guestToDelete, setGuestToDelete] = React.useState<GuestWithCount | null>(null)
  const [editingGuest, setEditingGuest] = React.useState<GuestWithCount | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)

  async function handleDelete() {
    if (!guestToDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/guests/${guestToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete guest")
      }

      toast.success("Guest deleted successfully")
      setGuestToDelete(null)
      router.refresh()
    } catch (error) {
      toast.error("Something went wrong. Please try again.")
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[250px]">Guest Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Total Visits</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-lg font-medium">No guests found</p>
                    <p className="text-sm">Try searching for a different name or email.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              guests.map((guest) => (
                <TableRow key={guest.id} className="group cursor-default">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {guest.firstName} {guest.lastName}
                      </span>
                      {guest.notes && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-md w-fit">
                          <Note size={12} weight="duotone" />
                          <span className="truncate max-w-[200px]">{guest.notes}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {guest.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Envelope size={14} className="shrink-0" />
                          <span>{guest.email}</span>
                        </div>
                      )}
                      {guest.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone size={14} className="shrink-0" />
                          <span>{guest.phone}</span>
                        </div>
                      )}
                      {!guest.email && !guest.phone && (
                        <span className="text-sm text-muted-foreground italic">No contact info</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal border-amber-500/10 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                      {guest._count?.reservations || 0} visits
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar size={14} />
                      <span>{formatInTimeZone(guest.createdAt, "UTC", "MMM d, yyyy")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                          <DotsThreeVertical size={18} weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="gap-2"
                          onClick={() => {
                            setEditingGuest(guest)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <PencilSimple size={16} />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 text-destructive focus:text-destructive"
                          onClick={() => setGuestToDelete(guest)}
                        >
                          <Trash size={16} />
                          Delete Guest
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="gap-1"
            >
              <CaretLeft size={16} />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="gap-1"
            >
              Next
              <CaretRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Guest Dialog */}
      <GuestDialog 
        guest={editingGuest || undefined} 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!guestToDelete} onOpenChange={(open) => !open && setGuestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete <strong>{guestToDelete?.firstName} {guestToDelete?.lastName}</strong> and all their reservation history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Guest"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
