import { formatTicketStatus } from "@/lib/format";
import type { StaffUser } from "@/lib/types";

export function isOnsiteStaff(role: string | null | undefined) {
  return ["on_site", "onsite", "site_staff", "maintenance_staff"].includes(role ?? "");
}

export function isAdminStaff(role: string | null | undefined) {
  return ["admin", "manager"].includes(role ?? "");
}

export function getAssignableStaff(staff: StaffUser[]) {
  const onsiteStaff = staff.filter((person) => isOnsiteStaff(person.role));

  if (onsiteStaff.length === 0) {
    return staff;
  }

  return [
    ...onsiteStaff,
    ...staff.filter((person) => !isOnsiteStaff(person.role)),
  ];
}

export function displayStaffName(staff: {
  full_name: string | null;
  email?: string | null;
  role?: string | null;
}) {
  return staff.full_name ?? staff.email ?? formatTicketStatus(staff.role ?? "staff");
}
