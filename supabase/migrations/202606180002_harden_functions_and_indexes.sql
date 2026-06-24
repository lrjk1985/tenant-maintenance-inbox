create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists conversations_unit_id_idx
  on public.whatsapp_conversations(unit_id);

create index if not exists messages_sent_by_staff_idx
  on public.whatsapp_messages(sent_by_staff_id);

create index if not exists tickets_tenant_id_idx
  on public.maintenance_tickets(tenant_id);

create index if not exists tickets_unit_id_idx
  on public.maintenance_tickets(unit_id);

create index if not exists tickets_source_conversation_idx
  on public.maintenance_tickets(source_conversation_id);

create index if not exists tickets_source_message_idx
  on public.maintenance_tickets(source_message_id);

create index if not exists tickets_created_by_staff_idx
  on public.maintenance_tickets(created_by_staff_id);

create index if not exists ticket_updates_actor_staff_idx
  on public.maintenance_ticket_updates(actor_staff_id);

create index if not exists audit_logs_actor_staff_idx
  on public.audit_logs(actor_staff_id);
