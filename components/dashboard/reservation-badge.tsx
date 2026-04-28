import { Badge } from "@/components/ui/badge"

export type ReservationDerivedState = 
  | "PENDING"
  | "CONFIRMED"
  | "ARRIVED"
  | "SEATED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "LATE"
  | "OVERSTAYED"

export function ReservationBadge({ state }: { state: ReservationDerivedState }) {
  switch (state) {
    case "LATE":
      return <Badge variant="destructive">Late &gt; 15m</Badge>
    case "OVERSTAYED":
      return <Badge variant="destructive">Overstayed</Badge>
    case "CONFIRMED":
      return <Badge variant="outline" className="border-blue-500 text-blue-500">Confirmed</Badge>
    case "ARRIVED":
      return <Badge variant="outline" className="border-amber-500 text-amber-500">Arrived</Badge>
    case "SEATED":
      return <Badge variant="outline" className="border-emerald-500 text-emerald-500">Seated</Badge>
    case "COMPLETED":
      return <Badge variant="secondary">Completed</Badge>
    case "CANCELLED":
      return <Badge variant="destructive">Cancelled</Badge>
    case "NO_SHOW":
      return <Badge variant="secondary">No Show</Badge>
    case "PENDING":
    default:
      return <Badge variant="outline">Pending</Badge>
  }
}
