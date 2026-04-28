import { TableCell, TableRow } from "@/components/ui/table"
import { UserIcon } from "@phosphor-icons/react"
import { formatInTimeZone } from "date-fns-tz"
import { ReservationBadge, type ReservationDerivedState } from "./reservation-badge"
import { ReservationWithDetails } from "./reservation-dialog"
import { ReactNode } from "react"

interface ReservationRowProps {
  reservation: ReservationWithDetails;
  restaurantTimezone: string;
  derivedState: ReservationDerivedState;
  isPending: boolean;
  actions: ReactNode;
}

export function ReservationRow({
  reservation: res,
  restaurantTimezone,
  derivedState,
  isPending,
  actions
}: ReservationRowProps) {
  const isTerminal = res.status === "COMPLETED" || res.status === "CANCELLED" || res.status === "NO_SHOW"
  
  return (
    <TableRow className={`
      ${isPending ? "opacity-50 pointer-events-none" : ""} 
      ${isTerminal ? "opacity-50 grayscale" : ""}
    `}>
      <TableCell className="font-medium">
        {formatInTimeZone(res.startTime, restaurantTimezone, "HH:mm")}
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
        <ReservationBadge state={derivedState} />
      </TableCell>
      <TableCell className="text-right">
        {actions}
      </TableCell>
    </TableRow>
  )
}
