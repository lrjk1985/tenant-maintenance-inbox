import type {
  MaintenanceTicket,
  Tenant,
  Unit,
  WhatsAppConversation,
} from "@/lib/types";

export type DataQualityIssue = {
  count: number;
  href: string;
  label: string;
  severity: "amber" | "green" | "red";
};

export function buildDataQualityIssues({
  conversations,
  tenants,
  tickets,
  units,
}: {
  conversations: WhatsAppConversation[];
  tenants: Tenant[];
  tickets: MaintenanceTicket[];
  units: Unit[];
}): DataQualityIssue[] {
  const tenantUnitIds = new Set(
    tenants.flatMap((tenant) => (tenant.unit_id ? [tenant.unit_id] : [])),
  );
  const activeTickets = tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status));

  return [
    {
      count: conversations.filter((conversation) => !conversation.tenant_id || !conversation.unit_id)
        .length,
      href: "/",
      label: "Unlinked chats",
      severity: "amber",
    },
    {
      count: tenants.filter((tenant) => !tenant.unit_id).length,
      href: "/admin?view=directory",
      label: "Tenants without units",
      severity: "amber",
    },
    {
      count: units.filter((unit) => !tenantUnitIds.has(unit.id)).length,
      href: "/admin?view=directory",
      label: "Units without tenants",
      severity: "green",
    },
    {
      count: activeTickets.filter((ticket) => !ticket.tenant_id || !ticket.unit_id).length,
      href: "/tickets?view=open",
      label: "Active tickets missing tenant/unit",
      severity: "red",
    },
    {
      count: tickets.filter((ticket) => !ticket.source_message_id).length,
      href: "/tickets?view=all",
      label: "Tickets without source message",
      severity: "amber",
    },
  ];
}
