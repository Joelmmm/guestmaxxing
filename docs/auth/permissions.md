# Role-Based Access Control (RBAC) & Permissions

This document outlines the architecture for managing and asserting user roles securely across both the Server (API/Server Components) and Client (React frontend) in the Guestmaxxing application.

We use a multi-tenant model mapped via the **Better Auth Organization Plugin**, assigning users `owner`, `admin`, or `member` roles for a specific restaurant (Organization).

## Overview of Abstractions

Because of the Next.js App Router paradigm, we utilize split abstractions based on the execution context:
1. **API Route Protection**: `verifyRestaurantAccess()`
2. **Server Components (UI)**: `getServerRestaurantAccess()`
3. **Client Components (UI)**: `useOrganizationRoles()`

---

### 1. API Route Protection (`verifyRestaurantAccess`)
**Location:** `/lib/api-utils.ts`

Any backend API Route (`route.ts`) that mutates data must enforce rigid boundary checks to prevent a standard `member` or unauthorized user from escalating privileges (e.g. deleting a restaurant). 

**Usage:**
```typescript
import { verifyRestaurantAccess } from "@/lib/api-utils"

export async function DELETE(req: Request, { params }: { params: { restaurantId: string } }) {
  // Only owners can delete a restaurant.
  const auth = await verifyRestaurantAccess(params.restaurantId, ['owner'])
  
  if (!auth.isAuthorized) return auth.response // Instantly returns Next Response 401/403
  
  // Safe to proceed, full DB context and membership logic is available if needed
  const { organizationId, membership } = auth; 
  // ... perform deletion
}
```

---

### 2. Server Components UI (`getServerRestaurantAccess`)
**Location:** `/lib/api-utils.ts`

For Server Components (`page.tsx` or `layout.tsx`), we need securely verified booleans to alter the layout before the HTML is even streamed to the client (e.g., completely removing forms from the DOM). 

This function performs secure database checks without returning a hard API `NextResponse`, making it ideal for UI evaluation logic.

**Usage:**
```tsx
import { getServerRestaurantAccess } from "@/lib/api-utils"

export default async function SettingsPage() {
  // Pass the ID to grab the flags securely on the server
  const { canManage, isOwner } = await getServerRestaurantAccess(restaurant.id)

  return (
    <div>
      <SettingsForm canManage={canManage} />
      {isOwner && <DangerZoneDeleteButton />}
    </div>
  )
}
```

---

### 3. Client Components UI (`useOrganizationRoles`)
**Location:** `/hooks/use-organization-roles.ts`

When working intimately with React Client forms or highly nested components underneath a `"use client"` directive, "Prop Drilling" `canManage` through 5 component layers can become a massive headache. 

This client hook safely taps into Better Auth's hydrated client-side cache (specifically `session.activeOrganization.role`) to yield deterministic UI flags instantly, **without triggering additional fetch calls on your DB**.

**Usage:**
```tsx
"use client"
import { useOrganizationRoles } from "@/hooks/use-organization-roles"

export function NewAreaButton() {
  const { canManage, isLoading } = useOrganizationRoles()

  if (isLoading || !canManage) return null;

  return <Button>Create New Area</Button>
}
```

## The Role Hierarchy

Our system defaults point to Better Auth's standardized trio of roles:

- **`owner`**: The creator or primary stakeholder of the restaurant constraint. Has absolute power, including Danger Zone actions (Deactivate Restaurant) and integrations. Translates to `canManage: true` and `isOwner: true`.
- **`admin`**: Managerial staff. Can alter standard restaurant configurations (tables, dining areas, hours of operation). Translates to `canManage: true`.
- **`member`**: Standard floor staff. Can visualize the layout, handle reservations, and execute the standard business loop, but deep system configuration is locked out.

## Protected Routes Mapping

We enforce role requirements at the route level. Below is the mapping of protected API routes and the minimum role required to access them:

| Route Path | Method | Minimum Role Required | Purpose |
|------------|--------|-----------------------|---------|
| `/api/restaurants/[id]` | `PATCH` | `admin` | Update restaurant settings (name, timezone, etc.) |
| `/api/restaurants/[id]` | `DELETE` | `owner` | Deactivate/delete the entire restaurant |
| `/api/restaurants/[id]/dining-areas` | `POST`, `PATCH`, `DELETE` | `admin` | Manage dining areas |
| `/api/restaurants/[id]/tables` | `POST`, `PATCH`, `DELETE` | `admin` | Manage tables and capacities |
| `/api/restaurants/[id]/operating-hours` | `POST` | `admin` | Manage operating schedules |
| `/api/reservations` | `GET` | `member` | View reservations pipeline |
| `/api/dashboard/stats` | `GET` | `member` | View daily operational dashboard stats |

*Note: Any route retrieving configuration details (`GET` for tables, dining areas) currently requires at least `member` access to ensure the caller belongs to the organization.*
