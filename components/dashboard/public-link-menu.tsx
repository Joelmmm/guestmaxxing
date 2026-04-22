"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Copy, Link as LinkIcon, ArrowSquareOut } from "@phosphor-icons/react"
import { toast } from "sonner"
import Link from "next/link"

interface PublicLinkMenuProps {
  restaurantSlug: string
}

export function PublicLinkMenu({ restaurantSlug }: PublicLinkMenuProps) {
  const [open, setOpen] = useState(false)
  const publicUrl = `/reserve/${restaurantSlug}`

  const copyToClipboard = async () => {
    try {
      const fullUrl = `${window.location.origin}${publicUrl}`
      await navigator.clipboard.writeText(fullUrl)
      toast.success("Link copied to clipboard")
      setOpen(false)
    } catch (err) {
      toast.error("Failed to copy link")
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <LinkIcon weight="bold" />
          Share Public Link
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Public Reservation Page</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link 
            href={publicUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="cursor-pointer flex items-center gap-2"
          >
            <ArrowSquareOut weight="bold" />
            Open in new tab
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer flex items-center gap-2">
          <Copy weight="bold" />
          Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
