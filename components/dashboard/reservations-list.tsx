"use client"

import { useState, useTransition } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  DotsThreeVerticalIcon,
  UserIcon,
  CheckIcon,
  XCircleIcon,
  ArrowRightIcon,
  PlusIcon,
  PencilSimpleIcon,
  TrashIcon
} from "@phosphor-icons/react"
import { formatInTimeZone } from "date-fns-tz"
import { toast } from "sonner"
import { ReservationDialog, type ReservationWithDetails } from "./reservation-dialog"
import { DateStrip } from "./date-strip"
import { updateReservationAction, deleteReservationAction } from "@/app/actions/reservations"

export function ReservationsList({
  initialData: reservations,
  restaurantId,
  restaurantTimezone,
  currentDateStr,
}: {
  initialData: ReservationWithDetails[]
  restaurantId: string
  restaurantTimezone: string
  currentDateStr: string
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null)
  const [isPending, startTransition] = useTransition()

  const updateStatus = (id: string, newStatus: string) => {
    startTransition(async () => {
      const result = await updateReservationAction(id, { status: newStatus })
      if (result.success) {
        toast.success(`Status updated to ${newStatus}`)
      } else {
        toast.error(result.error || "Failed to update status")
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this reservation?")) return

    startTransition(async () => {
      const result = await deleteReservationAction(id)
      if (result.success) {
        toast.success("Reservation deleted")
      } else {
        toast.error(result.error || "Failed to delete reservation")
      }
    })
  }

  const handleEdit = (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setSelectedReservation(null)
    setIsDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED": return <Badge variant="outline" className="border-blue-500 text-blue-500">Confirmed</Badge>
      case "ARRIVED": return <Badge variant="outline" className="border-amber-500 text-amber-500">Arrived</Badge>
      case "SEATED": return <Badge variant="outline" className="border-emerald-500 text-emerald-500">Seated</Badge>
      case "COMPLETED": return <Badge variant="secondary">Completed</Badge>
      case "CANCELLED": return <Badge variant="destructive">Cancelled</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="w-full sm:w-[300px]">
          <DateStrip currentDateStr={currentDateStr} restaurantTimezone={restaurantTimezone} />
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2" disabled={isPending}>
          <PlusIcon className="size-4" />
          Add Reservation
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No reservations for today.
                </TableCell>
              </TableRow>
            ) : (
              reservations.map((res) => (
                <TableRow key={res.id} className={isPending ? "opacity-50 pointer-events-none" : ""}>
                  <TableCell className="font-medium">
                    {formatInTimeZone(res.startTime, res.restaurant.timezone, "HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserIcon data-icon="inline-start" className="size-4 text-muted-foreground" />
                      <span>
                        {res.guest
                          ? `${res.guest.firstName} ${res.guest.lastName}`
                          : "Unknown Guest"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{res.partySize}</TableCell>
                  <TableCell>
                    {res.tables.map(t => t.table.name).join(", ")}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(res.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isPending}>
                          <DotsThreeVerticalIcon className="size-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {res.status === "CONFIRMED" && (
                          <DropdownMenuItem onClick={() => updateStatus(res.id, "ARRIVED")}>
                            <CheckIcon data-icon="inline-start" className="size-4 mr-2" />
                            Mark as Arrived
                          </DropdownMenuItem>
                        )}
                        {(res.status === "CONFIRMED" || res.status === "ARRIVED") && (
                          <DropdownMenuItem onClick={() => updateStatus(res.id, "SEATED")}>
                            <ArrowRightIcon data-icon="inline-start" className="size-4 mr-2" />
                            Seat Table
                          </DropdownMenuItem>
                        )}
                        {res.status === "SEATED" && (
                          <DropdownMenuItem onClick={() => updateStatus(res.id, "COMPLETED")}>
                            <CheckIcon data-icon="inline-start" className="size-4 mr-2" />
                            Complete
                          </DropdownMenuItem>
                        )}
                        {res.status !== "CANCELLED" && res.status !== "COMPLETED" && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => updateStatus(res.id, "CANCELLED")}
                          >
                            <XCircleIcon data-icon="inline-start" className="size-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(res)}>
                          <PencilSimpleIcon data-icon="inline-start" className="size-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(res.id)}
                        >
                          <TrashIcon data-icon="inline-start" className="size-4 mr-2" />
                          Delete
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

      <ReservationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        restaurantId={restaurantId}
        restaurantTimezone={restaurantTimezone}
        reservation={selectedReservation || undefined}
        onSuccess={() => setIsDialogOpen(false)}
      />
    </div>
  )
}
