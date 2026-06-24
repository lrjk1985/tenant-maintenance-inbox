import assert from "node:assert/strict";
import { test } from "node:test";

import { buildStaffWorkload } from "../src/lib/staff-workload.ts";
import type { MaintenanceTicket, StaffUser } from "../src/lib/types.ts";

const staff: StaffUser[] = [
  { user_id: "staff-1", full_name: "Rina Lee", role: "on_site" },
  { user_id: "staff-2", full_name: "Alex Tan", role: "on_site" },
];

function ticket(
  id: string,
  status: MaintenanceTicket["status"],
  priority: MaintenanceTicket["priority"],
  assignedStaffId: string | null,
): MaintenanceTicket {
  return {
    id,
    ticket_number: Number(id.replace("ticket-", "")),
    title: id,
    description: null,
    tenant_id: null,
    unit_id: null,
    source_conversation_id: null,
    source_message_id: null,
    attached_images: [],
    priority,
    status,
    assigned_staff_id: assignedStaffId,
    created_by_staff_id: null,
    created_at: "2026-06-22T03:15:00.000Z",
    updated_at: "2026-06-22T04:15:00.000Z",
  };
}

test("counts active tickets and urgent tickets by staff", () => {
  const summary = buildStaffWorkload(
    [
      ticket("ticket-1", "assigned", "urgent", "staff-1"),
      ticket("ticket-2", "waiting_for_tenant", "normal", "staff-1"),
      ticket("ticket-3", "open", "urgent", null),
      ticket("ticket-4", "closed", "urgent", "staff-2"),
    ],
    staff,
  );

  assert.deepEqual(
    summary.staffWorkloads.map((workload) => ({
      staff: workload.staff.user_id,
      open: workload.openCount,
      urgent: workload.urgentCount,
    })),
    [
      { staff: "staff-1", open: 2, urgent: 1 },
      { staff: "staff-2", open: 0, urgent: 0 },
    ],
  );
  assert.equal(summary.unassignedOpenCount, 1);
  assert.equal(summary.unassignedUrgentCount, 1);
});
