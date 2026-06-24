import type { AuditLog, StaffUser } from "@/lib/types";

const auditCsvHeaders = [
  "created_at",
  "actor",
  "action",
  "entity_type",
  "entity_id",
  "metadata",
];

export function auditLogsToCsv(logs: AuditLog[], staff: StaffUser[]) {
  const staffById = new Map(staff.map((person) => [person.user_id, person]));
  const rows = logs.map((log) => {
    const actor = log.actor_staff_id ? staffById.get(log.actor_staff_id) : null;

    return [
      log.created_at,
      actor ? displayCsvStaffName(actor) : "System",
      log.action,
      log.entity_type,
      log.entity_id ?? "",
      JSON.stringify(log.metadata ?? {}),
    ];
  });

  return [auditCsvHeaders, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function displayCsvStaffName(staff: StaffUser) {
  return staff.full_name ?? staff.email ?? "Staff User";
}
