# WhatsApp Tenant Maintenance Inbox

Focused MVP for existing tenants to submit operations and maintenance requests over WhatsApp.

## Stack

- Next.js App Router + TypeScript
- Supabase Postgres, Auth, and private Storage
- Tailwind CSS
- Vercel deployment
- Meta WhatsApp Cloud API webhooks and send endpoint
- Resend email notifications

## What This MVP Does

- Receives inbound WhatsApp text, image, and video messages at `/api/whatsapp/webhook`
- Auto-links a conversation when the sender phone matches an existing tenant
- Stores conversation and message history in Supabase Postgres
- Stores inbound WhatsApp photos and short videos in the private `maintenance-media` Supabase Storage bucket
- Shows staff an internal maintenance inbox
- Lets staff link a conversation to a tenant and unit
- Lets staff create, assign, and update maintenance tickets from WhatsApp messages
- Shows an all-tickets work queue with status, priority, tenant/unit, assignment, and filters
- Lets staff reply to tenants through WhatsApp from the dashboard
- Emails staff when a new tenant WhatsApp service request is received
- Audit logs key actions

It intentionally does not include chatbot flows, broadcasts, prospect CRM, contractor access, a public tenant portal, or ERP-style modules.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Create a Supabase project, then run:

```sql
-- Supabase SQL editor
-- Paste supabase/migrations/202605280001_tenant_maintenance_inbox.sql
```

Optional sample tenants and units:

```sql
-- Supabase SQL editor
-- Paste supabase/seed.sql
```

4. Add staff users in Supabase Auth. Optional staff profile rows can be added to `staff_users` using each auth user's UUID.

5. Start the app:

```bash
npm run dev
```

Without Supabase variables, the app opens with demo data so the inbox shape is visible.

## On-site Staff Assignment

Create one Supabase Auth user for each on-site staff member, then add a matching profile row in `staff_users`. Use the role `on_site` for mall staff who should appear in the assignment list and receive new-request email notifications:

```sql
insert into public.staff_users (user_id, full_name, email, role)
values
  ('auth-user-uuid-for-staff-1', 'Rina Lee', 'rina@example.com', 'on_site'),
  ('auth-user-uuid-for-staff-2', 'Daniel Koh', 'daniel@example.com', 'on_site'),
  ('auth-user-uuid-for-staff-3', 'Mei Wong', 'mei@example.com', 'on_site')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role;
```

After those rows exist, staff can assign a maintenance ticket to an on-site team member when creating the ticket or later from the ticket editor.

## Environment Variables

Client-safe:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Server-only:

```bash
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_APP_SECRET=
WHATSAPP_GRAPH_API_VERSION=v23.0
RESEND_API_KEY=
RESEND_FROM_EMAIL="Tenant Maintenance Requests <notifications@your-domain.example>"
```

Do not prefix Meta tokens, Supabase secret keys, or the legacy service role key with `NEXT_PUBLIC_`.

Set `NEXT_PUBLIC_APP_URL` in production if email notifications should include a direct chat link.

## Meta WhatsApp Setup

Set the webhook callback URL in Meta to:

```text
https://your-domain.example/api/whatsapp/webhook
```

Use the same value for `WHATSAPP_VERIFY_TOKEN` in Vercel and Meta. Subscribe the WhatsApp app to the `messages` webhook field.

For outbound staff replies, configure `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and optionally `WHATSAPP_APP_SECRET` for request signature verification.

## Media Storage Policy

The `maintenance-media` bucket is private and accepts maintenance photos plus short videos. The default file limit is 25 MB so tenants can send useful issue clips without encouraging long video uploads.

Recommended operating policy:

- Keep media for open tickets.
- Review or archive media after tickets are resolved.
- Delete non-critical resolved-ticket media after 6-12 months.
- Ask tenants for short videos only when motion or sound helps diagnose the issue.

## Vercel Deployment

1. Import this project into Vercel.
2. Add every variable from `.env.example` in Project Settings.
3. Deploy.
4. Put the deployed webhook URL into Meta's WhatsApp app settings.

## Security Notes

- WhatsApp and Supabase server secrets are only read in Route Handlers and Server Actions.
- RLS is enabled on every public table.
- New Supabase Data API behavior is handled with explicit grants for `authenticated` and `service_role`.
- The private Storage bucket requires authenticated access; inbound webhook media is uploaded server-side.
- Dashboard mutations re-check the authenticated Supabase user server-side.
