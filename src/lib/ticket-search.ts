import type { MaintenanceTicket, StaffUser, TicketStatus } from "@/lib/types";

export function filterTicketsByViewAndSearch(
  tickets: MaintenanceTicket[],
  staff: StaffUser[],
  view: string,
  query: string | null | undefined,
) {
  const visibleByView = filterTicketsByView(tickets, view);
  const needle = normalizeSearchText(query);

  if (!needle) {
    return visibleByView;
  }

  const staffById = new Map(staff.map((person) => [person.user_id, person]));

  return visibleByView.filter((ticket) => {
    const assignedStaff = ticket.assigned_staff_id
      ? staffById.get(ticket.assigned_staff_id)
      : null;
    const unitText = ticket.unit
      ? `${ticket.unit.property_name} ${ticket.unit.unit_label} ${ticket.unit.address ?? ""}`
      : "";
    const haystack = normalizeSearchText(
      [
        ticket.ticket_number,
        `#${ticket.ticket_number}`,
        ticket.title,
        ticket.description,
        ticket.status,
        formatSearchLabel(ticket.status),
        ticket.priority,
        formatSearchLabel(ticket.priority),
        ticket.tenant?.tenant_name,
        ticket.tenant?.company_name,
        ticket.tenant?.phone_number,
        unitText,
        ticket.source_message?.message_type,
        ticket.source_message?.body,
        assignedStaff ? displaySearchStaffName(assignedStaff) : "Unassigned",
      ].join(" "),
    );

    return haystack.includes(needle);
  });
}

export function filterTicketsByView(tickets: MaintenanceTicket[], view: string) {
  if (view === "all") {
    return tickets;
  }

  if (view === "unassigned") {
    return tickets.filter((ticket) => !ticket.assigned_staff_id);
  }

  if (view === "urgent") {
    return tickets.filter((ticket) => ticket.priority === "urgent");
  }

  if (view === "resolved") {
    return tickets.filter((ticket) => ["resolved", "closed"].includes(ticket.status));
  }

  return tickets.filter((ticket) => isOpenStatus(ticket.status));
}

export function isOpenStatus(status: TicketStatus) {
  return !["resolved", "closed"].includes(status);
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function displaySearchStaffName(staff: StaffUser) {
  return staff.full_name ?? staff.email ?? "Staff User";
}

function formatSearchLabel(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
