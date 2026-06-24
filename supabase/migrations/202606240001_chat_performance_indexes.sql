create index if not exists whatsapp_conversations_last_message_at_idx
  on public.whatsapp_conversations (last_message_at desc nulls last);

create index if not exists whatsapp_messages_conversation_created_at_idx
  on public.whatsapp_messages (conversation_id, created_at desc);

create index if not exists maintenance_tickets_conversation_updated_at_idx
  on public.maintenance_tickets (source_conversation_id, updated_at desc);

create index if not exists maintenance_ticket_updates_ticket_created_at_idx
  on public.maintenance_ticket_updates (ticket_id, created_at desc);
