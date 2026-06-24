"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedStaff } from "@/lib/auth";
import { normalizePhoneNumber } from "@/lib/format";
import { isAdminStaff } from "@/lib/staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/types";

const postgresUuid = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(postgresUuid.nullable());

const linkConversationSchema = z.object({
  conversation_id: postgresUuid,
  tenant_id: optionalUuid,
  unit_id: optionalUuid,
});

const createTicketSchema = z.object({
  conversation_id: postgresUuid,
  source_message_id: optionalUuid,
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).optional(),
  priority: z.enum(TICKET_PRIORITIES),
  assigned_staff_id: optionalUuid,
});

const updateTicketSchema = z.object({
  ticket_id: postgresUuid,
  conversation_id: z.string().trim().optional(),
  return_to: z
    .string()
    .trim()
    .startsWith("/")
    .refine((value) => !value.startsWith("//"))
    .optional(),
  status: z.enum(TICKET_STATUSES),
  assigned_staff_id: optionalUuid,
  body: z.string().trim().max(2000).optional(),
});

const adminUpdateTicketSchema = z.object({
  ticket_id: postgresUuid,
  return_to: z
    .string()
    .trim()
    .startsWith("/")
    .refine((value) => !value.startsWith("//"))
    .optional(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).optional(),
  priority: z.enum(TICKET_PRIORITIES),
  status: z.enum(TICKET_STATUSES),
  assigned_staff_id: optionalUuid,
  body: z.string().trim().max(2000).optional(),
});

const replySchema = z.object({
  conversation_id: postgresUuid,
  reply_body: z.string().trim().min(1).max(4096),
});

const unitSchema = z.object({
  property_name: z.string().trim().min(2).max(120),
  unit_label: z.string().trim().min(1).max(40),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const createTenantSchema = z.object({
  tenant_name: z.string().trim().min(2).max(120),
  company_name: z.string().trim().max(160).optional(),
  phone_number: z.string().trim().min(6).max(40),
  unit_id: optionalUuid,
  lease_status: z.enum(["active", "ending_soon", "expired", "past_due"]),
  notes: z.string().trim().max(1000).optional(),
});

const updateTenantSchema = createTenantSchema.extend({
  tenant_id: postgresUuid,
});

const staffRoleSchema = z.enum(["admin", "manager", "on_site", "staff"]);

const createStaffSchema = z.object({
  user_id: postgresUuid,
  full_name: z.string().trim().min(2).max(120),
  email: z.email().trim().max(160),
  role: staffRoleSchema,
});

const updateStaffSchema = createStaffSchema;

const removeStaffSchema = z.object({
  user_id: postgresUuid,
});

async function requireAdminStaff() {
  const staff = await requireAuthenticatedStaff();

  if (!isAdminStaff(staff.role)) {
    redirect("/");
  }

  return staff;
}

function revalidateDashboardSharedLookups() {
  updateTag("dashboard-shared-lookups");
}

export async function linkConversationAction(formData: FormData) {
  const staff = await requireAuthenticatedStaff();
  const supabase = await createSupabaseServerClient();
  const input = linkConversationSchema.parse(Object.fromEntries(formData));

  const { data: tenant } = input.tenant_id
    ? await supabase
        .from("tenants")
        .select("id, unit_id")
        .eq("id", input.tenant_id)
        .maybeSingle()
    : { data: null };

  const unitId = input.unit_id ?? tenant?.unit_id ?? null;

  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({
      tenant_id: input.tenant_id,
      unit_id: unitId,
    })
    .eq("id", input.conversation_id);

  if (error) {
    throw error;
  }

  const { error: ticketUpdateError } = await supabase
    .from("maintenance_tickets")
    .update({
      tenant_id: input.tenant_id,
      unit_id: unitId,
    })
    .eq("source_conversation_id", input.conversation_id);

  if (ticketUpdateError) {
    throw ticketUpdateError;
  }

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: "whatsapp.conversation.linked",
    entity_type: "whatsapp_conversation",
    entity_id: input.conversation_id,
    metadata: {
      tenant_id: input.tenant_id,
      unit_id: unitId,
      synced_ticket_links: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/tickets");
  revalidateDashboardSharedLookups();
  redirect(`/?conversation=${input.conversation_id}`);
}

export async function createTicketAction(formData: FormData) {
  const staff = await requireAuthenticatedStaff();
  const supabase = await createSupabaseServerClient();
  const input = createTicketSchema.parse(Object.fromEntries(formData));

  const { data: conversation, error: conversationError } = await supabase
    .from("whatsapp_conversations")
    .select("id, tenant_id, unit_id")
    .eq("id", input.conversation_id)
    .single();

  if (conversationError) {
    throw conversationError;
  }

  const { data: sourceMessage } = input.source_message_id
    ? await supabase
        .from("whatsapp_messages")
        .select("id, storage_bucket, storage_path, media_mime_type, body")
        .eq("id", input.source_message_id)
        .maybeSingle()
    : { data: null };

  const attachedImages =
    sourceMessage?.storage_path && sourceMessage.storage_bucket
      ? [
          {
            bucket: sourceMessage.storage_bucket,
            path: sourceMessage.storage_path,
            type: sourceMessage.media_mime_type,
          },
        ]
      : [];

  const { data: ticket, error } = await supabase
    .from("maintenance_tickets")
    .insert({
      title: input.title,
      description:
        input.description ||
        sourceMessage?.body ||
        "Created from a WhatsApp maintenance message.",
      tenant_id: conversation.tenant_id,
      unit_id: conversation.unit_id,
      source_conversation_id: input.conversation_id,
      source_message_id: input.source_message_id,
      attached_images: attachedImages,
      priority: input.priority,
      status: input.assigned_staff_id ? "assigned" : "open",
      assigned_staff_id: input.assigned_staff_id,
      created_by_staff_id: staff.user_id,
    })
    .select("id, status")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("maintenance_ticket_updates").insert({
    ticket_id: ticket.id,
    actor_staff_id: staff.user_id,
    update_type: "created",
    body: "Created from WhatsApp inbox.",
    to_status: ticket.status,
    metadata: { source_message_id: input.source_message_id },
  });

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: "maintenance.ticket.created",
    entity_type: "maintenance_ticket",
    entity_id: ticket.id,
    metadata: {
      source_conversation_id: input.conversation_id,
      source_message_id: input.source_message_id,
      assigned_staff_id: input.assigned_staff_id,
    },
  });

  revalidatePath("/");
  revalidateDashboardSharedLookups();
  redirect(`/?conversation=${input.conversation_id}`);
}

export async function updateTicketAction(formData: FormData) {
  const staff = await requireAuthenticatedStaff();
  const supabase = await createSupabaseServerClient();
  const input = updateTicketSchema.parse(Object.fromEntries(formData));

  const { data: existing, error: existingError } = await supabase
    .from("maintenance_tickets")
    .select("status, assigned_staff_id")
    .eq("id", input.ticket_id)
    .single();

  if (existingError) {
    throw existingError;
  }

  const { error } = await supabase
    .from("maintenance_tickets")
    .update({
      status: input.status,
      assigned_staff_id: input.assigned_staff_id,
      resolved_at: input.status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", input.ticket_id);

  if (error) {
    throw error;
  }

  await supabase.from("maintenance_ticket_updates").insert({
    ticket_id: input.ticket_id,
    actor_staff_id: staff.user_id,
    update_type: "updated",
    body: input.body || null,
    from_status: existing.status,
    to_status: input.status,
    metadata: {
      previous_assigned_staff_id: existing.assigned_staff_id,
      assigned_staff_id: input.assigned_staff_id,
    },
  });

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: "maintenance.ticket.updated",
    entity_type: "maintenance_ticket",
    entity_id: input.ticket_id,
    metadata: {
      from_status: existing.status,
      to_status: input.status,
      assigned_staff_id: input.assigned_staff_id,
    },
  });

  revalidatePath("/");
  revalidatePath("/tickets");
  revalidateDashboardSharedLookups();
  redirect(
    input.return_to ??
      (input.conversation_id ? `/?conversation=${input.conversation_id}` : "/"),
  );
}

export async function adminUpdateTicketAction(formData: FormData) {
  const staff = await requireAdminStaff();
  const supabase = await createSupabaseServerClient();
  const input = adminUpdateTicketSchema.parse(Object.fromEntries(formData));

  const { data: existing, error: existingError } = await supabase
    .from("maintenance_tickets")
    .select("title, description, priority, status, assigned_staff_id")
    .eq("id", input.ticket_id)
    .single();

  if (existingError) {
    throw existingError;
  }

  const { error } = await supabase
    .from("maintenance_tickets")
    .update({
      title: input.title,
      description: input.description || null,
      priority: input.priority,
      status: input.status,
      assigned_staff_id: input.assigned_staff_id,
      resolved_at: input.status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", input.ticket_id);

  if (error) {
    throw error;
  }

  await supabase.from("maintenance_ticket_updates").insert({
    ticket_id: input.ticket_id,
    actor_staff_id: staff.user_id,
    update_type: "admin_updated",
    body: input.body || "Admin edited ticket details.",
    from_status: existing.status,
    to_status: input.status,
    metadata: {
      previous_title: existing.title,
      title: input.title,
      previous_priority: existing.priority,
      priority: input.priority,
      previous_assigned_staff_id: existing.assigned_staff_id,
      assigned_staff_id: input.assigned_staff_id,
    },
  });

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: "admin.ticket.updated",
    entity_type: "maintenance_ticket",
    entity_id: input.ticket_id,
    metadata: {
      from_status: existing.status,
      to_status: input.status,
      previous_priority: existing.priority,
      priority: input.priority,
      previous_assigned_staff_id: existing.assigned_staff_id,
      assigned_staff_id: input.assigned_staff_id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidateDashboardSharedLookups();
  redirect(input.return_to ?? "/admin?view=tickets");
}

export async function replyToTenantAction(formData: FormData) {
  const staff = await requireAuthenticatedStaff();
  const supabase = await createSupabaseServerClient();
  const input = replySchema.parse(Object.fromEntries(formData));

  const { data: conversation, error: conversationError } = await supabase
    .from("whatsapp_conversations")
    .select("id, tenant_phone, wa_id")
    .eq("id", input.conversation_id)
    .single();

  if (conversationError) {
    throw conversationError;
  }

  let whatsappMessageId: string | null = null;
  let deliveryStatus = "sent";
  let errorMessage: string | null = null;
  let rawPayload: Record<string, unknown> = {};

  try {
    const result = await sendWhatsAppText(conversation.tenant_phone, input.reply_body);
    whatsappMessageId = result.messages?.[0]?.id ?? null;
    deliveryStatus = result.messages?.[0]?.message_status ?? "sent";
    rawPayload = result;
  } catch (error) {
    deliveryStatus = "failed";
    errorMessage = error instanceof Error ? error.message : "WhatsApp send failed.";
  }

  const { data: message, error } = await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id: input.conversation_id,
      direction: "outbound",
      whatsapp_message_id: whatsappMessageId,
      message_type: "text",
      body: input.reply_body,
      delivery_status: deliveryStatus,
      error_message: errorMessage,
      sent_by_staff_id: staff.user_id,
      raw_payload: rawPayload,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  await supabase
    .from("whatsapp_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: input.reply_body,
      tenant_phone: `+${normalizePhoneNumber(conversation.tenant_phone)}`,
    })
    .eq("id", input.conversation_id);

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: deliveryStatus === "failed" ? "whatsapp.reply.failed" : "whatsapp.reply.sent",
    entity_type: "whatsapp_message",
    entity_id: message.id,
    metadata: {
      conversation_id: input.conversation_id,
      whatsapp_message_id: whatsappMessageId,
      error_message: errorMessage,
    },
  });

  revalidatePath("/");
  revalidateDashboardSharedLookups();
  redirect(`/?conversation=${input.conversation_id}`);
}

export async function createUnitAction(formData: FormData) {
  const staff = await requireAdminStaff();
  const supabase = await createSupabaseServerClient();
  const input = unitSchema.parse(Object.fromEntries(formData));

  const { data: unit, error } = await supabase
    .from("units")
    .insert({
      property_name: input.property_name,
      unit_label: input.unit_label,
      address: input.address || null,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: "admin.unit.created",
    entity_type: "unit",
    entity_id: unit.id,
    metadata: {
      property_name: input.property_name,
      unit_label: input.unit_label,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidateDashboardSharedLookups();
  redirect("/admin?view=directory");
}

export async function createTenantAction(formData: FormData) {
  const staff = await requireAdminStaff();
  const supabase = await createSupabaseServerClient();
  const input = createTenantSchema.parse(Object.fromEntries(formData));

  const { data: tenant, error } = await supabase
    .from("tenants")
    .insert({
      tenant_name: input.tenant_name,
      company_name: input.company_name || null,
      phone_number: input.phone_number,
      normalized_phone: normalizePhoneNumber(input.phone_number),
      unit_id: input.unit_id,
      lease_status: input.lease_status,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: "admin.tenant.created",
    entity_type: "tenant",
    entity_id: tenant.id,
    metadata: {
      tenant_name: input.tenant_name,
      unit_id: input.unit_id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidateDashboardSharedLookups();
  redirect("/admin?view=directory");
}

export async function updateTenantAction(formData: FormData) {
  const staff = await requireAdminStaff();
  const supabase = await createSupabaseServerClient();
  const input = updateTenantSchema.parse(Object.fromEntries(formData));

  const { error } = await supabase
    .from("tenants")
    .update({
      tenant_name: input.tenant_name,
      company_name: input.company_name || null,
      phone_number: input.phone_number,
      normalized_phone: normalizePhoneNumber(input.phone_number),
      unit_id: input.unit_id,
      lease_status: input.lease_status,
      notes: input.notes || null,
    })
    .eq("id", input.tenant_id);

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: "admin.tenant.updated",
    entity_type: "tenant",
    entity_id: input.tenant_id,
    metadata: {
      tenant_name: input.tenant_name,
      unit_id: input.unit_id,
      lease_status: input.lease_status,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidateDashboardSharedLookups();
  redirect("/admin?view=directory");
}

export async function createStaffAction(formData: FormData) {
  const staff = await requireAdminStaff();
  const supabase = await createSupabaseServerClient();
  const input = createStaffSchema.parse(Object.fromEntries(formData));

  const { error } = await supabase.from("staff_users").insert({
    user_id: input.user_id,
    full_name: input.full_name,
    email: input.email,
    role: input.role,
  });

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: "admin.staff.created",
    entity_type: "staff_user",
    entity_id: input.user_id,
    metadata: {
      full_name: input.full_name,
      email: input.email,
      role: input.role,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidateDashboardSharedLookups();
  redirect("/admin");
}

export async function updateStaffAction(formData: FormData) {
  const staff = await requireAdminStaff();
  const supabase = await createSupabaseServerClient();
  const input = updateStaffSchema.parse(Object.fromEntries(formData));

  const { data: existing, error: existingError } = await supabase
    .from("staff_users")
    .select("full_name, email, role")
    .eq("user_id", input.user_id)
    .single();

  if (existingError) {
    throw existingError;
  }

  const { error } = await supabase
    .from("staff_users")
    .update({
      full_name: input.full_name,
      email: input.email,
      role: input.role,
    })
    .eq("user_id", input.user_id);

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: "admin.staff.updated",
    entity_type: "staff_user",
    entity_id: input.user_id,
    metadata: {
      previous_full_name: existing.full_name,
      full_name: input.full_name,
      previous_email: existing.email,
      email: input.email,
      previous_role: existing.role,
      role: input.role,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidateDashboardSharedLookups();
  redirect("/admin");
}

export async function removeStaffAction(formData: FormData) {
  const staff = await requireAdminStaff();
  const supabase = await createSupabaseServerClient();
  const input = removeStaffSchema.parse(Object.fromEntries(formData));

  if (input.user_id === staff.user_id) {
    throw new Error("You cannot remove your own staff access while signed in.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("staff_users")
    .select("full_name, email, role")
    .eq("user_id", input.user_id)
    .single();

  if (existingError) {
    throw existingError;
  }

  const { error } = await supabase
    .from("staff_users")
    .delete()
    .eq("user_id", input.user_id);

  if (error) {
    throw error;
  }

  await supabase.from("audit_logs").insert({
    actor_staff_id: staff.user_id,
    action: "admin.staff.removed",
    entity_type: "staff_user",
    entity_id: input.user_id,
    metadata: {
      full_name: existing.full_name,
      email: existing.email,
      role: existing.role,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidateDashboardSharedLookups();
  redirect("/admin");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
