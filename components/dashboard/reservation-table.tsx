import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReactNode } from "react"

export function ReservationTable({ children }: { children: ReactNode }) {
  return (
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
          {children}
        </TableBody>
      </Table>
    </div>
  )
}
