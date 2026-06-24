import assert from "node:assert/strict";
import { test } from "node:test";

import { auditLogsToCsv } from "../src/lib/audit-csv.ts";
import type { AuditLog, StaffUser } from "../src/lib/types.ts";

const staff: StaffUser[] = [
  {
    user_id: "staff-1",
    full_name: "Kenneth Lee",
    role: "manager",
  },
];

const logs: AuditLog[] = [
  {
    id: "audit-1",
    actor_staff_id: "staff-1",
    action: "maintenance.ticket.created",
    entity_type: "maintenance_ticket",
    entity_id: "ticket-1",
    metadata: { title: 'Leak near "main" counter', unit: "B2-14" },
    created_at: "2026-06-22T03:15:00.000Z",
  },
  {
    id: "audit-2",
    actor_staff_id: null,
    action: "whatsapp.message.received",
    entity_type: "whatsapp_message",
    entity_id: null,
    metadata: { message_type: "image" },
    created_at: "2026-06-22T04:15:00.000Z",
  },
];

test("exports audit logs as escaped CSV", () => {
  assert.equal(
    auditLogsToCsv(logs, staff),
    [
      "created_at,actor,action,entity_type,entity_id,metadata",
      '2026-06-22T03:15:00.000Z,Kenneth Lee,maintenance.ticket.created,maintenance_ticket,ticket-1,"{""title"":""Leak near \\""main\\"" counter"",""unit"":""B2-14""}"',
      '2026-06-22T04:15:00.000Z,System,whatsapp.message.received,whatsapp_message,,"{""message_type"":""image""}"',
    ].join("\n"),
  );
});
