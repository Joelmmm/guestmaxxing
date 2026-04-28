import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  DotsThreeVerticalIcon,
  CheckIcon,
  XCircleIcon,
  ArrowRightIcon,
  PencilSimpleIcon,
  TrashIcon
} from "@phosphor-icons/react"
import { ReservationWithDetails } from "./reservation-dialog"

interface ReservationActionsProps {
  reservation: ReservationWithDetails;
  isPending: boolean;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onEdit: (res: ReservationWithDetails) => void;
  onDelete: (id: string) => void;
}

export function ReservationActions({
  reservation: res,
  isPending,
  onUpdateStatus,
  onEdit,
  onDelete
}: ReservationActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <DotsThreeVerticalIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {res.status === "CONFIRMED" && (
          <DropdownMenuItem onClick={() => onUpdateStatus(res.id, "ARRIVED")}>
            <CheckIcon data-icon="inline-start" className="size-4 mr-2" />
            Mark as Arrived
          </DropdownMenuItem>
        )}
        {(res.status === "CONFIRMED" || res.status === "ARRIVED") && (
          <DropdownMenuItem onClick={() => onUpdateStatus(res.id, "SEATED")}>
            <ArrowRightIcon data-icon="inline-start" className="size-4 mr-2" />
            Seat Table
          </DropdownMenuItem>
        )}
        {res.status === "SEATED" && (
          <DropdownMenuItem onClick={() => onUpdateStatus(res.id, "COMPLETED")}>
            <CheckIcon data-icon="inline-start" className="size-4 mr-2" />
            Complete
          </DropdownMenuItem>
        )}
        {res.status !== "CANCELLED" && res.status !== "COMPLETED" && res.status !== "NO_SHOW" && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onUpdateStatus(res.id, "CANCELLED")}
          >
            <XCircleIcon data-icon="inline-start" className="size-4 mr-2" />
            Cancel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEdit(res)}>
          <PencilSimpleIcon data-icon="inline-start" className="size-4 mr-2" />
          Edit Details
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(res.id)}
        >
          <TrashIcon data-icon="inline-start" className="size-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
