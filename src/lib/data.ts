import { redirect } from "next/navigation";

import { getPublicSupabaseConfig } from "@/lib/env";
import { getDemoDashboardData } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AuditLog,
  DashboardData,
  HistoryData,
  MaintenanceTicket,
  StaffUser,
  Tenant,
  TicketUpdate,
  Unit,
  WhatsAppConversation,
  WhatsAppMessage,
} from "@/lib/types";

export async function getDashboardData(
  selectedConversationId?: string | null,
): Promise<DashboardData> {
  if (!getPublicSupabaseConfig()) {
    return getDemoDashboardData();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const setupIssues: string[] = [];

  const [
    staffResult,
    unitsResult,
    tenantsResult,
    conversationsResult,
    ticketsResult,
  ] = await Promise.all([
    supabase.from("staff_users").select("user_id, full_name, role, email").order("full_name"),
    supabase
      .from("units")
      .select("id, property_name, unit_label, address, notes")
      .order("property_name")
      .order("unit_label"),
    supabase
      .from("tenants")
      .select(
        "id, tenant_name, company_name, phone_number, normalized_phone, unit_id, lease_status, notes, unit:units(id, property_name, unit_label, address, notes)",
      )
      .order("tenant_name"),
    supabase
      .from("whatsapp_conversations")
      .select(
        "id, wa_id, tenant_phone, contact_name, tenant_id, unit_id, status, last_message_at, last_message_preview, tenant:tenants(id, tenant_name, company_name, phone_number, normalized_phone, unit_id, lease_status, notes), unit:units(id, property_name, unit_label, address, notes)",
      )
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("maintenance_tickets")
      .select(
        "id, ticket_number, title, description, tenant_id, unit_id, source_conversation_id, source_message_id, attached_images, priority, status, assigned_staff_id, created_by_staff_id, created_at, updated_at, tenant:tenants(id, tenant_name, company_name, phone_number, normalized_phone, unit_id, lease_status, notes), unit:units(id, property_name, unit_label, address, notes), source_message:whatsapp_messages!maintenance_tickets_source_message_id_fkey(id, direction, message_type, body, created_at)",
      )
      .order("updated_at", { ascending: false })
      .limit(60),
  ]);

  for (const result of [
    staffResult,
    unitsResult,
    tenantsResult,
    conversationsResult,
    ticketsResult,
  ]) {
    if (result.error) {
      setupIssues.push(result.error.message);
    }
  }

  const staffProfiles = (staffResult.data as StaffUser[] | null) ?? [];
  const currentStaffProfile = staffProfiles.find((person) => person.user_id === user.id);
  const currentStaff: StaffUser = {
    user_id: user.id,
    full_name:
      currentStaffProfile?.full_name ??
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      "Staff User",
    role: currentStaffProfile?.role ?? "staff",
    email: currentStaffProfile?.email ?? user.email,
  };

  const staff = dedupeStaff([
    ...staffProfiles,
    currentStaff,
  ]);

  const conversations =
    (conversationsResult.data as unknown as WhatsAppConversation[] | null) ?? [];
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ??
    conversations[0] ??
    null;

  let messages: WhatsAppMessage[] = [];
  let ticketUpdates: TicketUpdate[] = [];

  if (selectedConversation) {
    const { data: messageData, error: messageError } = await supabase
      .from("whatsapp_messages")
      .select(
        "id, conversation_id, direction, whatsapp_message_id, message_type, body, media_id, media_mime_type, media_sha256, storage_bucket, storage_path, delivery_status, error_message, sent_by_staff_id, created_at",
      )
      .eq("conversation_id", selectedConversation.id)
      .order("created_at", { ascending: true });

    if (messageError) {
      setupIssues.push(messageError.message);
    }

    messages = await addSignedMediaUrls(
      supabase,
      (messageData as WhatsAppMessage[] | null) ?? [],
    );

    const selectedTicketIds = ((ticketsResult.data as MaintenanceTicket[] | null) ?? [])
      .filter((ticket) => ticket.source_conversation_id === selectedConversation.id)
      .map((ticket) => ticket.id);

    if (selectedTicketIds.length > 0) {
      const { data: updateData, error: updateError } = await supabase
        .from("maintenance_ticket_updates")
        .select(
          "id, ticket_id, actor_staff_id, update_type, body, from_status, to_status, created_at",
        )
        .in("ticket_id", selectedTicketIds)
        .order("created_at", { ascending: false });

      if (updateError) {
        setupIssues.push(updateError.message);
      }

      ticketUpdates = (updateData as TicketUpdate[] | null) ?? [];
    }
  }

  return {
    configured: true,
    demo: false,
    user: currentStaff,
    conversations,
    selectedConversation,
    messages,
    tenants: (tenantsResult.data as unknown as Tenant[] | null) ?? [],
    units: (unitsResult.data as Unit[] | null) ?? [],
    tickets: (ticketsResult.data as unknown as MaintenanceTicket[] | null) ?? [],
    ticketUpdates,
    staff,
    auditLogs: [],
    setupIssues,
  };
}

export async function getHistoryData(): Promise<HistoryData> {
  if (!getPublicSupabaseConfig()) {
    const demo = getDemoDashboardData();

    return {
      configured: demo.configured,
      demo: demo.demo,
      user: demo.user,
      staff: demo.staff,
      auditLogs: demo.auditLogs,
      setupIssues: demo.setupIssues,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const setupIssues: string[] = [];
  const [staffResult, auditResult] = await Promise.all([
    supabase.from("staff_users").select("user_id, full_name, role, email").order("full_name"),
    supabase
      .from("audit_logs")
      .select("id, actor_staff_id, action, entity_type, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  for (const result of [staffResult, auditResult]) {
    if (result.error) {
      setupIssues.push(result.error.message);
    }
  }

  const staffProfiles = (staffResult.data as StaffUser[] | null) ?? [];
  const currentStaffProfile = staffProfiles.find((person) => person.user_id === user.id);
  const currentStaff: StaffUser = {
    user_id: user.id,
    full_name:
      currentStaffProfile?.full_name ??
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      "Staff User",
    role: currentStaffProfile?.role ?? "staff",
    email: currentStaffProfile?.email ?? user.email,
  };

  return {
    configured: true,
    demo: false,
    user: currentStaff,
    staff: dedupeStaff([
      ...staffProfiles,
      currentStaff,
    ]),
    auditLogs: (auditResult.data as AuditLog[] | null) ?? [],
    setupIssues,
  };
}

async function addSignedMediaUrls(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  messages: WhatsAppMessage[],
) {
  return Promise.all(
    messages.map(async (message) => {
      if (!message.storage_path) {
        return { ...message, media_url: null };
      }

      const { data } = await supabase.storage
        .from(message.storage_bucket ?? "maintenance-media")
        .createSignedUrl(message.storage_path, 60 * 60);

      return { ...message, media_url: data?.signedUrl ?? null };
    }),
  );
}

function dedupeStaff(staff: StaffUser[]) {
  const byId = new Map<string, StaffUser>();

  for (const person of staff) {
    byId.set(person.user_id, person);
  }

  return Array.from(byId.values());
}
