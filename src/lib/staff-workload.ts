import type { MaintenanceTicket, StaffUser } from "@/lib/types";

export type StaffWorkload = {
  staff: StaffUser;
  openCount: number;
  urgentCount: number;
};

export type WorkloadSummary = {
  staffWorkloads: StaffWorkload[];
  unassignedOpenCount: number;
  unassignedUrgentCount: number;
};

export function buildStaffWorkload(
  tickets: MaintenanceTicket[],
  staff: StaffUser[],
): WorkloadSummary {
  const openTickets = tickets.filter((ticket) => isActiveTicket(ticket.status));
  const workloadByStaff = new Map(
    staff.map((person) => [
      person.user_id,
      {
        staff: person,
        openCount: 0,
        urgentCount: 0,
      },
    ]),
  );

  let unassignedOpenCount = 0;
  let unassignedUrgentCount = 0;

  for (const ticket of openTickets) {
    if (!ticket.assigned_staff_id) {
      unassignedOpenCount += 1;
      if (ticket.priority === "urgent") {
        unassignedUrgentCount += 1;
      }
      continue;
    }

    const workload = workloadByStaff.get(ticket.assigned_staff_id);
    if (!workload) {
      continue;
    }

    workload.openCount += 1;
    if (ticket.priority === "urgent") {
      workload.urgentCount += 1;
    }
  }

  return {
    staffWorkloads: Array.from(workloadByStaff.values()),
    unassignedOpenCount,
    unassignedUrgentCount,
  };
}

function isActiveTicket(status: MaintenanceTicket["status"]) {
  return !["resolved", "closed"].includes(status);
}
