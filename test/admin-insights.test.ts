import assert from "node:assert/strict";
import { test } from "node:test";

import { buildDataQualityIssues } from "../src/lib/admin-insights.ts";
import type { MaintenanceTicket, Tenant, Unit, WhatsAppConversation } from "../src/lib/types.ts";

const units: Unit[] = [
  { id: "unit-1", property_name: "Mall", unit_label: "01-01", address: null, notes: null },
  { id: "unit-2", property_name: "Mall", unit_label: "01-02", address: null, notes: null },
];

const tenants: Tenant[] = [
  {
    id: "tenant-1",
    tenant_name: "Tenant One",
    company_name: null,
    phone_number: "+65 1",
    normalized_phone: "651",
    unit_id: "unit-1",
    lease_status: "active",
    notes: null,
  },
  {
    id: "tenant-2",
    tenant_name: "Tenant Two",
    company_name: null,
    phone_number: "+65 2",
    normalized_phone: "652",
    unit_id: null,
    lease_status: "active",
    notes: null,
  },
];

const conversations: WhatsAppConversation[] = [
  {
    id: "conversation-1",
    wa_id: "wa-1",
    tenant_phone: "+65 1",
    contact_name: null,
    tenant_id: null,
    unit_id: null,
    status: "open",
    last_message_at: null,
    last_message_preview: null,
  },
];

const tickets: MaintenanceTicket[] = [
  {
    id: "ticket-1",
    ticket_number: 1,
    title: "Missing link",
    description: null,
    tenant_id: null,
    unit_id: null,
    source_conversation_id: null,
    source_message_id: null,
    attached_images: [],
    priority: "normal",
    status: "open",
    assigned_staff_id: null,
    created_by_staff_id: null,
    created_at: "2026-06-22T00:00:00.000Z",
    updated_at: "2026-06-22T00:00:00.000Z",
  },
];

test("builds admin data-quality counts", () => {
  const issues = buildDataQualityIssues({ conversations, tenants, tickets, units });

  assert.deepEqual(
    issues.map((issue) => [issue.label, issue.count]),
    [
      ["Unlinked chats", 1],
      ["Tenants without units", 1],
      ["Units without tenants", 1],
      ["Active tickets missing tenant/unit", 1],
      ["Tickets without source message", 1],
    ],
  );
});
