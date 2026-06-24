import assert from "node:assert/strict";
import { test } from "node:test";

import { filterTicketsByViewAndSearch } from "../src/lib/ticket-search.ts";
import type { MaintenanceTicket, StaffUser } from "../src/lib/types.ts";

const staff: StaffUser[] = [
  {
    user_id: "staff-1",
    full_name: "Rina Lee",
    role: "on_site",
  },
];

const tickets: MaintenanceTicket[] = [
  {
    id: "ticket-1",
    ticket_number: 102,
    title: "Aircon leaking",
    description: "Water dripping near the cashier counter",
    tenant_id: "tenant-1",
    unit_id: "unit-1",
    source_conversation_id: "conversation-1",
    source_message_id: "message-1",
    attached_images: [],
    priority: "urgent",
    status: "assigned",
    assigned_staff_id: "staff-1",
    created_by_staff_id: "staff-1",
    created_at: "2026-06-22T03:15:00.000Z",
    updated_at: "2026-06-22T04:15:00.000Z",
    tenant: {
      id: "tenant-1",
      tenant_name: "Blue Bottle",
      company_name: "Blue Bottle Coffee",
      phone_number: "+6512345678",
      normalized_phone: "6512345678",
      unit_id: "unit-1",
      lease_status: "active",
      notes: null,
    },
    unit: {
      id: "unit-1",
      property_name: "Harbour Mall",
      unit_label: "B2-14",
      address: null,
      notes: null,
    },
  },
  {
    id: "ticket-2",
    ticket_number: 103,
    title: "Door lock issue",
    description: null,
    tenant_id: null,
    unit_id: null,
    source_conversation_id: "conversation-2",
    source_message_id: null,
    attached_images: [],
    priority: "normal",
    status: "closed",
    assigned_staff_id: null,
    created_by_staff_id: null,
    created_at: "2026-06-22T05:15:00.000Z",
    updated_at: "2026-06-22T06:15:00.000Z",
  },
];

test("searches tickets by number, tenant, unit, staff, status, and priority", () => {
  assert.deepEqual(
    filterTicketsByViewAndSearch(tickets, staff, "all", "102").map((ticket) => ticket.id),
    ["ticket-1"],
  );
  assert.deepEqual(
    filterTicketsByViewAndSearch(tickets, staff, "all", "blue bottle").map((ticket) => ticket.id),
    ["ticket-1"],
  );
  assert.deepEqual(
    filterTicketsByViewAndSearch(tickets, staff, "all", "B2-14").map((ticket) => ticket.id),
    ["ticket-1"],
  );
  assert.deepEqual(
    filterTicketsByViewAndSearch(tickets, staff, "all", "rina").map((ticket) => ticket.id),
    ["ticket-1"],
  );
  assert.deepEqual(
    filterTicketsByViewAndSearch(tickets, staff, "all", "urgent").map((ticket) => ticket.id),
    ["ticket-1"],
  );
  assert.deepEqual(
    filterTicketsByViewAndSearch(tickets, staff, "all", "closed").map((ticket) => ticket.id),
    ["ticket-2"],
  );
});

test("combines ticket search with the selected view", () => {
  assert.deepEqual(
    filterTicketsByViewAndSearch(tickets, staff, "open", "door").map((ticket) => ticket.id),
    [],
  );
  assert.deepEqual(
    filterTicketsByViewAndSearch(tickets, staff, "resolved", "door").map((ticket) => ticket.id),
    ["ticket-2"],
  );
});
