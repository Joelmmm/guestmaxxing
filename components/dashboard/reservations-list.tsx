"use client"

import { useState, useTransition, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { PlusIcon } from "@phosphor-icons/react"
import { TableRow, TableCell } from "@/components/ui/table"
import { ReservationDialog, type ReservationWithDetails } from "./reservation-dialog"
import { DateStrip } from "./date-strip"
import { updateReservationAction, deleteReservationAction } from "@/app/actions/reservations"

import { ReservationTable } from "./reservation-table"
import { ReservationGroup } from "./reservation-group"
import { ReservationRow } from "./reservation-row"
import { ReservationActions } from "./reservation-actions"
import { type ReservationDerivedState } from "./reservation-badge"

type ReservationWithDerivedState = ReservationWithDetails & { derivedState: ReservationDerivedState }

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

  // Derive UI States dynamically
  const { actionRequired, activeFloor, upcoming, completed } = useMemo(() => {
    const now = Date.now()
    const FIFTEEN_MINS = 15 * 60 * 1000

    const groups = {
      actionRequired: [] as ReservationWithDerivedState[],
      activeFloor: [] as ReservationWithDerivedState[],
      upcoming: [] as ReservationWithDerivedState[],
      completed: [] as ReservationWithDerivedState[],
    }

    reservations.forEach(res => {
      const startTime = new Date(res.startTime).getTime()
      // If endTime is missing from details, we assume 90 mins from start
      const endTime = res.endTime ? new Date(res.endTime).getTime() : startTime + 90 * 60 * 1000

      let derivedState: ReservationDerivedState = res.status as ReservationDerivedState

      if ((res.status === "CONFIRMED" || res.status === "PENDING") && now > startTime + FIFTEEN_MINS) {
        derivedState = "LATE"
        groups.actionRequired.push({ ...res, derivedState })
      } else if (res.status === "SEATED" && now > endTime) {
        derivedState = "OVERSTAYED"
        groups.actionRequired.push({ ...res, derivedState })
      } else if (res.status === "ARRIVED" || res.status === "SEATED") {
        groups.activeFloor.push({ ...res, derivedState })
      } else if (res.status === "CONFIRMED" || res.status === "PENDING") {
        groups.upcoming.push({ ...res, derivedState })
      } else {
        groups.completed.push({ ...res, derivedState })
      }
    })

    return groups
  }, [reservations])

  const renderRow = (res: ReservationWithDerivedState) => (
    <ReservationRow
      key={res.id}
      reservation={res}
      restaurantTimezone={restaurantTimezone}
      derivedState={res.derivedState}
      isPending={isPending}
      actions={
        <ReservationActions
          reservation={res}
          isPending={isPending}
          onUpdateStatus={updateStatus}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      }
    />
  )

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

      <ReservationTable>
        {reservations.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No reservations for today.
            </TableCell>
          </TableRow>
        ) : (
          <>
            {actionRequired.length > 0 && (
              <ReservationGroup title="Action Required" variant="destructive">
                {actionRequired.map(renderRow)}
              </ReservationGroup>
            )}

            {activeFloor.length > 0 && (
              <ReservationGroup title="Active Floor">
                {activeFloor.map(renderRow)}
              </ReservationGroup>
            )}

            {upcoming.length > 0 && (
              <ReservationGroup title="Upcoming">
                {upcoming.map(renderRow)}
              </ReservationGroup>
            )}

            {completed.length > 0 && (
              <ReservationGroup title="Completed" variant="muted">
                {completed.map(renderRow)}
              </ReservationGroup>
            )}
          </>
        )}
      </ReservationTable>

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
