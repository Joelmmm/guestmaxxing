"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"
import { CreateOrganizationForm } from "@/components/organization/create-organization-form"

export default function CreateOrganizationPage() {
  const router = useRouter()

  const handleSuccess = async (organizationId: string) => {
    // Automatically set it as the active organization for the current session
    await authClient.organization.setActive({
      organizationId
    })
    
    // Push user into the app
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl">Create your Workspace</CardTitle>
        <CardDescription>
          This is the top-level Container for your restaurant locations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CreateOrganizationForm 
          onSuccess={handleSuccess} 
          onCancel={() => router.back()} 
        />
      </CardContent>
    </Card>
  )
}
