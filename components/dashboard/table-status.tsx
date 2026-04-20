"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table as TableIcon,
  Users,
  DotsThreeVertical,
  PencilSimple,
  Trash,
  Info,
  Plus
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { TableDialog } from "./table-dialog"
import { DiningAreaDialog } from "./dining-area-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DiningArea {
  id: string
  name: string
  description?: string | null
  tables: Table[]
}

interface Table {
  id: string
  name: string
  minCapacity: number
  maxCapacity: number
  isActive: boolean
  diningAreaId: string
  reservations: { reservation: { status: string; partySize: number } }[]
}

export function TableStatus({ restaurantId, canManage = false }: { restaurantId: string, canManage?: boolean }) {
  const [diningAreas, setDiningAreas] = useState<DiningArea[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<{ type: 'table' | 'area', id: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const router = useRouter()

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/tables`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setDiningAreas(data)
    } catch (err) {
      console.error("Failed to fetch tables", err)
      toast.error("Could not load table layout")
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    fetchTables()
    const interval = setInterval(fetchTables, 30000)
    return () => clearInterval(interval)
  }, [fetchTables])

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const endpoint = deleteId.type === 'table' 
        ? `/api/restaurants/${restaurantId}/tables/${deleteId.id}`
        : `/api/restaurants/${restaurantId}/dining-areas/${deleteId.id}`
      
      const res = await fetch(endpoint, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      
      toast.success(`${deleteId.type === 'table' ? 'Table' : 'Dining area'} deleted`)
      setDeleteId(null)
      fetchTables()
      router.refresh()
    } catch (err) {
      toast.error("Delete failed. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading && diningAreas.length === 0) {
    return (
      <div className="grid gap-8">
        {[1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-4">
            <Skeleton className="h-7 w-48" />
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (diningAreas.length === 0) {
    return (
      <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center bg-muted/5">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Info className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">No Dining Areas Configured</h3>
        <p className="text-muted-foreground max-w-xs mx-auto mt-2">
          Start by adding a dining area to organize your tables.
        </p>
        <div className="mt-6">
          {canManage && <DiningAreaDialog restaurantId={restaurantId} />}
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {diningAreas.map((area) => (
        <div key={area.id} className="flex flex-col gap-6">
          <div className="flex items-center justify-between group">
            <div className="flex flex-col">
              <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                {area.name}
                <Badge variant="outline" className="font-normal text-xs text-muted-foreground ml-2">
                  {area.tables.length} {area.tables.length === 1 ? 'Table' : 'Tables'}
                </Badge>
              </h3>
              {area.description && (
                <p className="text-sm text-muted-foreground">{area.description}</p>
              )}
            </div>
            
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <DotsThreeVertical size={20} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DiningAreaDialog restaurantId={restaurantId} initialData={area}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <PencilSimple className="mr-2 size-4" /> Edit Area
                    </DropdownMenuItem>
                  </DiningAreaDialog>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setDeleteId({ type: 'area', id: area.id })}
                  >
                    <Trash className="mr-2 size-4" /> Delete Area
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {area.tables.map((table) => {
              const activeRes = table.reservations[0]?.reservation
              const isOccupied = activeRes?.status === "ARRIVED" || activeRes?.status === "SEATED"
              
              return (
                <Card 
                  key={table.id} 
                  className={cn(
                    "group relative overflow-hidden transition-all duration-200 border-muted/60",
                    isOccupied 
                      ? "bg-primary/5 border-primary/20 shadow-sm" 
                      : "hover:border-primary/30 hover:shadow-md cursor-default bg-card"
                  )}
                >
                  <CardContent className="p-4 flex flex-col gap-3 items-center">
                    <div className="flex items-center justify-between w-full">
                       <div className={cn(
                         "p-1.5 rounded-lg",
                         isOccupied ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                       )}>
                         <TableIcon className="size-4" weight={isOccupied ? "fill" : "regular"} />
                       </div>
                       
                       {canManage && (
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <DotsThreeVertical size={16} weight="bold" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <TableDialog 
                               restaurantId={restaurantId} 
                               diningAreas={diningAreas.map(a => ({ id: a.id, name: a.name }))}
                               initialData={table}
                             >
                               <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                 <PencilSimple className="mr-2 size-4" /> Edit
                               </DropdownMenuItem>
                             </TableDialog>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setDeleteId({ type: 'table', id: table.id })}
                              >
                               <Trash className="mr-2 size-4" /> Delete
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       )}
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                        {table.name}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-medium">
                        <Users className="size-3" />
                        {table.minCapacity}-{table.maxCapacity}
                      </div>
                    </div>

                    <div className="w-full mt-1">
                      {isOccupied ? (
                        <div className="flex flex-col items-center gap-1">
                          <Badge className="w-full justify-center text-[10px] py-0.5 font-bold uppercase tracking-tight">
                            Occupied
                          </Badge>
                          <span className="text-[10px] text-primary/80 font-medium">
                            {activeRes.partySize} guests
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="w-full justify-center text-[10px] py-0.5 font-medium border-transparent bg-muted/60 text-muted-foreground">
                          Available
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            
            {canManage && (
              <TableDialog 
                restaurantId={restaurantId} 
                diningAreas={diningAreas.map(a => ({ id: a.id, name: a.name }))}
                initialData={undefined}
              >
                <button className="flex flex-col items-center justify-center gap-2 p-4 h-full min-h-[140px] rounded-xl border border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all group/add">
                  <div className="p-2 rounded-full bg-muted group-hover/add:bg-primary/10">
                    <Plus className="size-5" weight="bold" />
                  </div>
                  <span className="text-xs font-medium">Add Table</span>
                </button>
              </TableDialog>
            )}
          </div>
        </div>
      ))}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the 
              {deleteId?.type === 'table' ? ' table ' : ' dining area and ALL associated tables '}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
