import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicSupabaseConfig, getServerSupabaseConfig } from "@/lib/env";
import { getDemoDashboardData } from "@/lib/demo-data";
import { createSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";
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

const MESSAGE_PAGE_SIZE = 100;
const STAFF_SELECT = "user_id, full_name, role, email";
const UNIT_SELECT = "id, property_name, unit_label, address, notes";
const TENANT_SELECT =
  "id, tenant_name, company_name, phone_number, normalized_phone, unit_id, lease_status, notes, unit:units(id, property_name, unit_label, address, notes)";
const CONVERSATION_SELECT =
  "id, wa_id, tenant_phone, contact_name, tenant_id, unit_id, status, last_message_at, last_message_preview, tenant:tenants(id, tenant_name, company_name, phone_number, normalized_phone, unit_id, lease_status, notes), unit:units(id, property_name, unit_label, address, notes)";
const TICKET_SELECT =
  "id, ticket_number, title, description, tenant_id, unit_id, source_conversation_id, source_message_id, attached_images, priority, status, assigned_staff_id, created_by_staff_id, created_at, updated_at, tenant:tenants(id, tenant_name, company_name, phone_number, normalized_phone, unit_id, lease_status, notes), unit:units(id, property_name, unit_label, address, notes), source_message:whatsapp_messages!maintenance_tickets_source_message_id_fkey(id, direction, message_type, body, created_at)";
const MESSAGE_SELECT =
  "id, conversation_id, direction, whatsapp_message_id, message_type, body, media_id, media_mime_type, media_sha256, storage_bucket, storage_path, delivery_status, error_message, sent_by_staff_id, created_at";
const TICKET_UPDATE_SELECT =
  "id, ticket_id, actor_staff_id, update_type, body, from_status, to_status, created_at";

type DashboardSharedLookups = {
  conversations: WhatsAppConversation[];
  recentTickets: MaintenanceTicket[];
  setupIssues: string[];
  staffProfiles: StaffUser[];
  tenants: Tenant[];
  units: Unit[];
};

const getCachedDashboardSharedLookups = unstable_cache(
  async (): Promise<DashboardSharedLookups> => {
    const supabase = getSupabaseAdminClient();

    return fetchDashboardSharedLookups(supabase);
  },
  ["dashboard-shared-lookups-v1"],
  { revalidate: 10, tags: ["dashboard-shared-lookups"] },
);

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

  const shared = await getDashboardSharedLookups(supabase);
  setupIssues.push(...shared.setupIssues);

  const staffProfiles = shared.staffProfiles;
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

  const conversations = shared.conversations;
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ??
    conversations[0] ??
    null;

  let messages: WhatsAppMessage[] = [];
  let ticketUpdates: TicketUpdate[] = [];
  let selectedTickets: MaintenanceTicket[] = [];

  if (selectedConversation) {
    const { data: messageData, error: messageError } = await supabase
      .from("whatsapp_messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", selectedConversation.id)
      .order("created_at", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE);

    if (messageError) {
      setupIssues.push(messageError.message);
    }

    messages = await addSignedMediaUrls(
      supabase,
      [...((messageData as WhatsAppMessage[] | null) ?? [])].reverse(),
    );

    const { data: selectedTicketData, error: selectedTicketError } = await supabase
      .from("maintenance_tickets")
      .select(TICKET_SELECT)
      .eq("source_conversation_id", selectedConversation.id)
      .order("updated_at", { ascending: false });

    if (selectedTicketError) {
      setupIssues.push(selectedTicketError.message);
    }

    selectedTickets = (selectedTicketData as unknown as MaintenanceTicket[] | null) ?? [];

    const selectedTicketIds = selectedTickets.map((ticket) => ticket.id);

    if (selectedTicketIds.length > 0) {
      const { data: updateData, error: updateError } = await supabase
        .from("maintenance_ticket_updates")
        .select(TICKET_UPDATE_SELECT)
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
    tenants: shared.tenants,
    units: shared.units,
    tickets: mergeTickets(shared.recentTickets, selectedTickets),
    ticketUpdates,
    staff,
    auditLogs: [],
    setupIssues,
  };
}

async function getDashboardSharedLookups(supabase: SupabaseClient) {
  if (getServerSupabaseConfig()) {
    return getCachedDashboardSharedLookups();
  }

  return fetchDashboardSharedLookups(supabase);
}

async function fetchDashboardSharedLookups(
  supabase: SupabaseClient,
): Promise<DashboardSharedLookups> {
  const setupIssues: string[] = [];
  const [
    staffResult,
    unitsResult,
    tenantsResult,
    conversationsResult,
    ticketsResult,
  ] = await Promise.all([
    supabase.from("staff_users").select(STAFF_SELECT).order("full_name"),
    supabase
      .from("units")
      .select(UNIT_SELECT)
      .order("property_name")
      .order("unit_label"),
    supabase
      .from("tenants")
      .select(TENANT_SELECT)
      .order("tenant_name"),
    supabase
      .from("whatsapp_conversations")
      .select(CONVERSATION_SELECT)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("maintenance_tickets")
      .select(TICKET_SELECT)
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

  return {
    conversations: (conversationsResult.data as unknown as WhatsAppConversation[] | null) ?? [],
    recentTickets: (ticketsResult.data as unknown as MaintenanceTicket[] | null) ?? [],
    setupIssues,
    staffProfiles: (staffResult.data as StaffUser[] | null) ?? [],
    tenants: (tenantsResult.data as unknown as Tenant[] | null) ?? [],
    units: (unitsResult.data as Unit[] | null) ?? [],
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
  supabase: SupabaseClient,
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

function mergeTickets(
  recentTickets: MaintenanceTicket[],
  selectedTickets: MaintenanceTicket[],
) {
  const byId = new Map<string, MaintenanceTicket>();

  for (const ticket of [...selectedTickets, ...recentTickets]) {
    byId.set(ticket.id, ticket);
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

function dedupeStaff(staff: StaffUser[]) {
  const byId = new Map<string, StaffUser>();

  for (const person of staff) {
    byId.set(person.user_id, person);
  }

  return Array.from(byId.values());
}
