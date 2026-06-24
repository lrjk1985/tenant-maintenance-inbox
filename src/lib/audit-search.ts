import type { AuditLog, StaffUser } from "@/lib/types";

export const AUDIT_CATEGORIES = [
  "all",
  "tickets",
  "tenant_links",
  "whatsapp",
  "staff_actions",
  "system_actions",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export type AuditFilterOptions = {
  category?: AuditCategory;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export function filterAuditLogs(
  logs: AuditLog[],
  staff: StaffUser[],
  query: string | null | undefined,
  options: AuditFilterOptions = {},
) {
  const needle = normalizeSearchText(query);
  const category = options.category ?? "all";
  const fromTime = startOfDayTime(options.dateFrom);
  const toTime = endOfDayTime(options.dateTo);

  const staffById = new Map(staff.map((person) => [person.user_id, person]));

  return logs.filter((log) => {
    if (!matchesCategory(log, category)) {
      return false;
    }

    const logTime = new Date(log.created_at).getTime();
    if (fromTime !== null && logTime < fromTime) {
      return false;
    }
    if (toTime !== null && logTime > toTime) {
      return false;
    }

    if (!needle) {
      return true;
    }

    const actor = log.actor_staff_id ? staffById.get(log.actor_staff_id) : null;
    const haystack = normalizeSearchText(
      [
        log.action,
        log.entity_type,
        log.entity_id,
        log.created_at,
        formatAuditSearchDate(log.created_at),
        actor ? displayAuditStaffName(actor) : "System",
        JSON.stringify(log.metadata ?? {}),
      ].join(" "),
    );

    return haystack.includes(needle);
  });
}

export function parseAuditCategory(value: string | null | undefined): AuditCategory {
  return AUDIT_CATEGORIES.includes(value as AuditCategory)
    ? (value as AuditCategory)
    : "all";
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function matchesCategory(log: AuditLog, category: AuditCategory) {
  if (category === "all") {
    return true;
  }

  if (category === "tickets") {
    return log.action.startsWith("maintenance.ticket");
  }

  if (category === "tenant_links") {
    return log.action === "whatsapp.conversation.linked";
  }

  if (category === "whatsapp") {
    return log.action.startsWith("whatsapp.");
  }

  if (category === "staff_actions") {
    return Boolean(log.actor_staff_id);
  }

  return !log.actor_staff_id;
}

function startOfDayTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  const time = date.getTime();

  return Number.isNaN(time) ? null : time;
}

function endOfDayTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999`);
  const time = date.getTime();

  return Number.isNaN(time) ? null : time;
}

function displayAuditStaffName(staff: StaffUser) {
  return staff.full_name ?? staff.email ?? "Staff User";
}

function formatAuditSearchDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
