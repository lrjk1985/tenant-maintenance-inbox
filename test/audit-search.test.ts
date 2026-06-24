import assert from "node:assert/strict";
import { test } from "node:test";

import { filterAuditLogs } from "../src/lib/audit-search.ts";
import type { AuditLog, StaffUser } from "../src/lib/types.ts";

const logs: AuditLog[] = [
  {
    id: "audit-1",
    actor_staff_id: "staff-1",
    action: "maintenance.ticket.created",
    entity_type: "maintenance_ticket",
    entity_id: "ticket-123",
    metadata: { title: "Leaking pipe", unit: "B2-14" },
    created_at: "2026-06-22T03:15:00.000Z",
  },
  {
    id: "audit-2",
    actor_staff_id: null,
    action: "whatsapp.message.received",
    entity_type: "whatsapp_message",
    entity_id: "message-456",
    metadata: { message_type: "image" },
    created_at: "2026-06-22T04:30:00.000Z",
  },
  {
    id: "audit-3",
    actor_staff_id: "staff-1",
    action: "whatsapp.conversation.linked",
    entity_type: "whatsapp_conversation",
    entity_id: "conversation-789",
    metadata: { tenant_name: "Blue Bottle" },
    created_at: "2026-06-24T01:00:00.000Z",
  },
];

const staff: StaffUser[] = [
  {
    user_id: "staff-1",
    full_name: "Kenneth Lee",
    role: "manager",
  },
];

test("filters audit logs by action, actor, entity, and metadata text", () => {
  assert.deepEqual(
    filterAuditLogs(logs, staff, "ticket").map((log) => log.id),
    ["audit-1"],
  );
  assert.deepEqual(
    filterAuditLogs(logs, staff, "kenneth").map((log) => log.id),
    ["audit-1", "audit-3"],
  );
  assert.deepEqual(
    filterAuditLogs(logs, staff, "image").map((log) => log.id),
    ["audit-2"],
  );
  assert.deepEqual(
    filterAuditLogs(logs, staff, "B2-14").map((log) => log.id),
    ["audit-1"],
  );
});

test("returns all audit logs when the search is blank", () => {
  assert.deepEqual(
    filterAuditLogs(logs, staff, "   ").map((log) => log.id),
    ["audit-1", "audit-2", "audit-3"],
  );
});

test("filters audit logs by audit category", () => {
  assert.deepEqual(
    filterAuditLogs(logs, staff, "", { category: "tickets" }).map((log) => log.id),
    ["audit-1"],
  );
  assert.deepEqual(
    filterAuditLogs(logs, staff, "", { category: "tenant_links" }).map((log) => log.id),
    ["audit-3"],
  );
  assert.deepEqual(
    filterAuditLogs(logs, staff, "", { category: "whatsapp" }).map((log) => log.id),
    ["audit-2", "audit-3"],
  );
  assert.deepEqual(
    filterAuditLogs(logs, staff, "", { category: "staff_actions" }).map((log) => log.id),
    ["audit-1", "audit-3"],
  );
  assert.deepEqual(
    filterAuditLogs(logs, staff, "", { category: "system_actions" }).map((log) => log.id),
    ["audit-2"],
  );
});

test("filters audit logs by inclusive date range", () => {
  assert.deepEqual(
    filterAuditLogs(logs, staff, "", {
      dateFrom: "2026-06-23",
      dateTo: "2026-06-24",
    }).map((log) => log.id),
    ["audit-3"],
  );
});
