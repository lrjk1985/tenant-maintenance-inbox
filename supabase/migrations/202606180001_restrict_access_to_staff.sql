create schema if not exists private;

create or replace function private.is_staff()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_users
    where user_id = auth.uid()
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_staff() to authenticated;

drop policy if exists "Authenticated staff can read units" on public.units;
drop policy if exists "Authenticated staff can manage units" on public.units;
drop policy if exists "Authenticated staff can read tenants" on public.tenants;
drop policy if exists "Authenticated staff can manage tenants" on public.tenants;
drop policy if exists "Authenticated staff can read staff profiles" on public.staff_users;
drop policy if exists "Authenticated staff can manage staff profiles" on public.staff_users;
drop policy if exists "Authenticated staff can read conversations" on public.whatsapp_conversations;
drop policy if exists "Authenticated staff can manage conversations" on public.whatsapp_conversations;
drop policy if exists "Authenticated staff can read messages" on public.whatsapp_messages;
drop policy if exists "Authenticated staff can manage messages" on public.whatsapp_messages;
drop policy if exists "Authenticated staff can read tickets" on public.maintenance_tickets;
drop policy if exists "Authenticated staff can manage tickets" on public.maintenance_tickets;
drop policy if exists "Authenticated staff can read ticket updates" on public.maintenance_ticket_updates;
drop policy if exists "Authenticated staff can manage ticket updates" on public.maintenance_ticket_updates;
drop policy if exists "Authenticated staff can read audit logs" on public.audit_logs;
drop policy if exists "Authenticated staff can insert audit logs" on public.audit_logs;

create policy "Staff can read units"
  on public.units for select to authenticated using (private.is_staff());
create policy "Staff can insert units"
  on public.units for insert to authenticated with check (private.is_staff());
create policy "Staff can update units"
  on public.units for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Staff can delete units"
  on public.units for delete to authenticated using (private.is_staff());

create policy "Staff can read tenants"
  on public.tenants for select to authenticated using (private.is_staff());
create policy "Staff can insert tenants"
  on public.tenants for insert to authenticated with check (private.is_staff());
create policy "Staff can update tenants"
  on public.tenants for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Staff can delete tenants"
  on public.tenants for delete to authenticated using (private.is_staff());

create policy "Staff can read staff profiles"
  on public.staff_users for select to authenticated using (private.is_staff());
create policy "Staff can insert staff profiles"
  on public.staff_users for insert to authenticated with check (private.is_staff());
create policy "Staff can update staff profiles"
  on public.staff_users for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Staff can delete staff profiles"
  on public.staff_users for delete to authenticated using (private.is_staff());

create policy "Staff can read conversations"
  on public.whatsapp_conversations for select to authenticated using (private.is_staff());
create policy "Staff can insert conversations"
  on public.whatsapp_conversations for insert to authenticated with check (private.is_staff());
create policy "Staff can update conversations"
  on public.whatsapp_conversations for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Staff can delete conversations"
  on public.whatsapp_conversations for delete to authenticated using (private.is_staff());

create policy "Staff can read messages"
  on public.whatsapp_messages for select to authenticated using (private.is_staff());
create policy "Staff can insert messages"
  on public.whatsapp_messages for insert to authenticated with check (private.is_staff());
create policy "Staff can update messages"
  on public.whatsapp_messages for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Staff can delete messages"
  on public.whatsapp_messages for delete to authenticated using (private.is_staff());

create policy "Staff can read tickets"
  on public.maintenance_tickets for select to authenticated using (private.is_staff());
create policy "Staff can insert tickets"
  on public.maintenance_tickets for insert to authenticated with check (private.is_staff());
create policy "Staff can update tickets"
  on public.maintenance_tickets for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Staff can delete tickets"
  on public.maintenance_tickets for delete to authenticated using (private.is_staff());

create policy "Staff can read ticket updates"
  on public.maintenance_ticket_updates for select to authenticated using (private.is_staff());
create policy "Staff can insert ticket updates"
  on public.maintenance_ticket_updates for insert to authenticated with check (private.is_staff());
create policy "Staff can update ticket updates"
  on public.maintenance_ticket_updates for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy "Staff can delete ticket updates"
  on public.maintenance_ticket_updates for delete to authenticated using (private.is_staff());

create policy "Staff can read audit logs"
  on public.audit_logs for select to authenticated using (private.is_staff());
create policy "Staff can insert audit logs"
  on public.audit_logs for insert to authenticated with check (private.is_staff());

drop policy if exists "Authenticated staff can read maintenance media" on storage.objects;
drop policy if exists "Authenticated staff can upload maintenance media" on storage.objects;
drop policy if exists "Authenticated staff can update maintenance media" on storage.objects;

create policy "Staff can read maintenance media"
  on storage.objects for select to authenticated
  using (bucket_id = 'maintenance-media' and private.is_staff());

create policy "Staff can upload maintenance media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'maintenance-media' and private.is_staff());

create policy "Staff can update maintenance media"
  on storage.objects for update to authenticated
  using (bucket_id = 'maintenance-media' and private.is_staff())
  with check (bucket_id = 'maintenance-media' and private.is_staff());
