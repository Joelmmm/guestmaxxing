# Organization & Multi-Tenancy Architecture

This document outlines the architectural decisions and product strategies surrounding Users, Organizations, and Restaurants (Multi-Tenancy) within the Reserva platform.

## 1. Core Data Model: The B2B Standard

The core hierarchy relies on a decoupled relationship between the **Identity** (User) and the **Tenant** (Organization):

`User (1) <---> (N) Organization (1) <---> (N) Restaurant`

- **1:N Organization-to-Restaurant Mapping**: An Organization acts as an umbrella grouping multiple `Restaurant` entities. This accommodates hospitality groups, chains, or individual owners who open secondary locations, preventing them from needing separate billing accounts or logins per restaurant.
- **Billing Entity**: The `Organization` is strictly the billing entity (the Stripe Customer). The `User` is merely an identity (email and password/OAuth). This allows a User to be a paying `Owner` in their own Organization, while simultaneously acting as a `Member` in a different Organization.

## 2. Onboarding & Provisioning Flows

To maintain this decoupling, the onboarding flow splits into two distinct paths depending on the context of the signup.

### Organic Signup Flow (The Business Owner)
1. User signs up without an invite link.
2. System creates the `User` account.
3. System creates an `Organization` and assigns the User the `Owner` role.
4. User enters the App or Checkout Flow as an initialized owner.

### Invited Signup Flow (The Staff Member)
1. User clicks an email invite link.
2. System creates the `User` account.
3. **Crucial Difference**: The system does *not* create a new Organization.
4. The system validates the invite token and adds the User to the inviter's Organization as a `Member` (or Admin).

### The Abandoned Setup Edge Case (Zero-Org State)
If a user signs up organically but aborts the payment/organization creation payload, they will exist as a `User` with **zero Organizations**. 
To explicitly catch this, we use a **Dashboard Gatekeeper** at `app/(dashboard)/layout.tsx` which queries the database for `memberCount > 0`. If `0`, it safely bounces the user to the lobby at `app/(onboarding)/page.tsx`. This onboarding route presents two paths: "Create Workspace" or "Pending Invites."

### The Invited Signup Flow Interception
To process the invited staff member seamlessly:
1. They arrive via `/accept-invite?id=<invitation_id>`.
2. `app/accept-invite/page.tsx` checks authentication. If logged out, redirects to `/sign-up` with a `returnTo` parameter.
3. Once logged in, the `accept-invite-client.tsx` triggers `authClient.organization.acceptInvitation()`.
4. It natively sets that organization to `active` and pushes the User to `/dashboard`. Gatekeeper clears them because they now possess an organization.

## 3. Product & Monetization Strategy (PLG)

Allowing invited staff to create their own Organizations later is a core Product-Led Growth (PLG) vector. A host or manager might leave to start their own restaurant and bring Reserva with them.

### The "Side Project" Workflow
Because of this requirement, Organization creation cannot be locked inside the `(onboarding)` route group (which bounces active users away). Instead, creation lives at a top-level, globally accessible route: `app/organization/create`. Both a brand-new 0-Org user and an existing active 3-Org user can access this route securely to build a new workspace.

### Frictionless Trials over Paywalls
Instead of blocking *Organization* creation with a hard paywall, it is architecturally and product-wise preferable to let any User create an Organization for free. 
- The paywall restrictions should be placed at the **activation level** (e.g., making the `Restaurant` public booking link live, or raising a 20-reservation cap limit). 
- This lets users experience the software setup process and realize its value before demanding credit card details.

## 4. Security and RBAC Considerations

### Active Session Context
When a user logs in, the Auth provider (Better Auth) loads their affiliations via the `members` table. The application session requires an `activeOrganizationId`. All backend API endpoints (e.g., `/api/restaurants`) must explicitly validate authorization against this `activeOrganizationId` derived from the session state, rather than just the user ID.

### Future Expansion: Resource-Level RBAC
Currently, RBAC (`Owner`, `Admin`, `Member`) operates at the Organization level. A `Member` in an Organization can theoretically access data for all `Restaurant` entities under that Organization. For large enterprise clients with distinct regional teams, a future iteration must introduce Resource-Level RBAC (e.g., a `RestaurantMember` mapping table) to restrict specific users to specific restaurant locations within an Organization.
