"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cancelReservationAction } from "./actions"
import { toast } from "sonner"

export function CancelReservationButton({ reservationId }: { reservationId: string }) {
  const [isPending, startTransition] = useTransition()
  
  function handleCancel(e: React.MouseEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await cancelReservationAction(reservationId)
      if (result.success) {
        toast.success("Reservation cancelled successfully.")
      } else {
        toast.error(result.error || "Failed to cancel reservation.")
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto text-destructive border-destructive hover:bg-destructive/10">
          Cancel Reservation
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Reservation?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this reservation? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? "Cancelling..." : "Yes, cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
