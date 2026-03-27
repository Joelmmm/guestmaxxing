"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  MagnifyingGlass, 
  DotsThreeVertical, 
  PencilSimple, 
  Trash, 
  Phone, 
  Envelope, 
  Calendar,
  Note
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { format } from "date-fns"

import { Input } from "@/components/ui/input"
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

interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  notes: string | null
  createdAt: Date
  _count?: {
    reservations: number
  }
}

interface GuestsListProps {
  initialData: Guest[]
}

export function GuestsList({ initialData }: GuestsListProps) {
  const [data, setData] = React.useState<Guest[]>(initialData)
  const [search, setSearch] = React.useState("")
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [guestToDelete, setGuestToDelete] = React.useState<Guest | null>(null)
  const [editingGuest, setEditingGuest] = React.useState<Guest | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const router = useRouter()

  const filteredGuests = data.filter((guest) => {
    const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase()
    const searchLower = search.toLowerCase()
    return (
      fullName.includes(searchLower) ||
      guest.email?.toLowerCase().includes(searchLower) ||
      guest.phone?.includes(searchLower)
    )
  })

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
      setData(data.filter((g) => g.id !== guestToDelete.id))
      setGuestToDelete(null)
      router.refresh()
    } catch (error) {
      toast.error("Something went wrong. Please try again.")
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, or phone..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <GuestDialog />
      </div>

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
            {filteredGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-lg font-medium">No guests found</p>
                    <p className="text-sm">Try searching for a different name or email.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredGuests.map((guest) => (
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
                      <span>{format(new Date(guest.createdAt), "MMM d, yyyy")}</span>
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
