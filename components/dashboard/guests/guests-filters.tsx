"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useDebounce } from "use-debounce"
import { MagnifyingGlass } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface GuestsFiltersProps {
  currentTab: string
  currentQuery: string
}

const TABS = [
  { id: "all", label: "All Guests" },
  { id: "vips", label: "VIPs" },
  { id: "new", label: "New Guests" },
  { id: "notes", label: "Has Notes" },
]

export function GuestsFilters({ currentTab, currentQuery }: GuestsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = React.useState(currentQuery)
  const [debouncedQuery] = useDebounce(query, 300)

  // Update URL when search changes
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (debouncedQuery) {
      params.set("q", debouncedQuery)
    } else {
      params.delete("q")
    }
    
    // Always reset to page 1 when searching
    params.set("page", "1")
    
    // Prevent pushing if it hasn't actually changed from URL
    if (debouncedQuery !== currentQuery) {
      router.push(`${pathname}?${params.toString()}`)
    }
  }, [debouncedQuery, currentQuery, pathname, router, searchParams])

  const handleTabClick = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tabId)
    params.set("page", "1") // Reset page when changing tabs
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              currentTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative w-full sm:w-auto sm:min-w-[300px]">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by name, email, or phone..." 
          className="pl-9 w-full bg-background/50"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    </div>
  )
}
