export const TICKET_STATUSES = [
  "open",
  "triaging",
  "assigned",
  "waiting_for_vendor",
  "waiting_for_tenant",
  "resolved",
  "closed",
] as const;

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type Unit = {
  id: string;
  property_name: string;
  unit_label: string;
  address: string | null;
  notes: string | null;
};

export type Tenant = {
  id: string;
  tenant_name: string;
  company_name: string | null;
  phone_number: string;
  normalized_phone: string;
  unit_id: string | null;
  lease_status: string;
  notes: string | null;
  unit?: Unit | null;
};

export type StaffUser = {
  user_id: string;
  full_name: string | null;
  role: string;
  email?: string | null;
};

export type WhatsAppConversation = {
  id: string;
  wa_id: string;
  tenant_phone: string;
  contact_name: string | null;
  tenant_id: string | null;
  unit_id: string | null;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  tenant?: Tenant | null;
  unit?: Unit | null;
};

export type WhatsAppMessage = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  whatsapp_message_id: string | null;
  message_type: string;
  body: string | null;
  media_id: string | null;
  media_mime_type: string | null;
  media_sha256: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  media_url?: string | null;
  delivery_status: string;
  error_message: string | null;
  sent_by_staff_id: string | null;
  created_at: string;
};

export type MaintenanceTicket = {
  id: string;
  ticket_number: number;
  title: string;
  description: string | null;
  tenant_id: string | null;
  unit_id: string | null;
  source_conversation_id: string | null;
  source_message_id: string | null;
  attached_images: Array<{ bucket: string; path: string; type?: string | null }>;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_staff_id: string | null;
  created_by_staff_id: string | null;
  created_at: string;
  updated_at: string;
  tenant?: Tenant | null;
  unit?: Unit | null;
  source_message?: Pick<
    WhatsAppMessage,
    "id" | "direction" | "message_type" | "body" | "created_at"
  > | null;
};

export type TicketUpdate = {
  id: string;
  ticket_id: string;
  actor_staff_id: string | null;
  update_type: string;
  body: string | null;
  from_status: TicketStatus | null;
  to_status: TicketStatus | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_staff_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type DashboardData = {
  configured: boolean;
  demo: boolean;
  user: StaffUser | null;
  conversations: WhatsAppConversation[];
  selectedConversation: WhatsAppConversation | null;
  messages: WhatsAppMessage[];
  tenants: Tenant[];
  units: Unit[];
  tickets: MaintenanceTicket[];
  ticketUpdates: TicketUpdate[];
  staff: StaffUser[];
  auditLogs: AuditLog[];
  setupIssues: string[];
};

export type HistoryData = {
  configured: boolean;
  demo: boolean;
  user: StaffUser | null;
  staff: StaffUser[];
  auditLogs: AuditLog[];
  setupIssues: string[];
};
