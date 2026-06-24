export function normalizePhoneNumber(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTicketStatus(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "Staff User").trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "SU";
}

export function compactText(value: string | null | undefined, max = 82) {
  const text = (value ?? "").trim();
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1)}...`;
}
