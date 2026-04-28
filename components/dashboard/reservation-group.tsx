import { ReactNode } from "react"
import { TableRow, TableCell } from "@/components/ui/table"

interface ReservationGroupProps {
  title: string;
  children: ReactNode;
  variant?: "default" | "destructive" | "muted";
}

export function ReservationGroup({ title, children, variant = "default" }: ReservationGroupProps) {
  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={6} className={`font-semibold text-sm py-2 ${variant === "destructive" ? "text-destructive" : variant === "muted" ? "text-muted-foreground" : ""}`}>
          {title}
        </TableCell>
      </TableRow>
      {children}
    </>
  )
}
