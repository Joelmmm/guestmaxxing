"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function AcceptInviteClient({ token, orgName }: { token: string, orgName: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAccept = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error: acceptError } = await authClient.organization.acceptInvitation({
        invitationId: token
      })

      if (acceptError) {
        setError(acceptError.message || "Failed to accept invite")
        return
      }

      // Success - we joined! Set this org as the active one so the Dashboard loads it immediately
      if (data && data.invitation?.organizationId) {
         await authClient.organization.setActive({
           organizationId: data.invitation.organizationId
         })
      }

      // Now route to dashboard, allowing the layout layout to process the updated auth context
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center">
          {error}
        </div>
      )}
      <Button size="lg" onClick={handleAccept} disabled={isLoading} className="w-full">
        {isLoading ? "Accepting..." : `Join ${orgName}`}
      </Button>
    </div>
  )
}
