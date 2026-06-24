import {
  Clock3,
  Download,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { AppNavigation } from "@/app/app-navigation";
import {
  AUDIT_CATEGORIES,
  filterAuditLogs,
  parseAuditCategory,
  type AuditCategory,
} from "@/lib/audit-search";
import { getHistoryData } from "@/lib/data";
import { compactText, formatDateTime } from "@/lib/format";
import { displayStaffName } from "@/lib/staff";
import type { AuditLog, StaffUser } from "@/lib/types";

type HistoryPageProps = {
  searchParams: Promise<{ category?: string; from?: string; q?: string; to?: string }>;
};

const categoryLabels: Record<AuditCategory, string> = {
  all: "All",
  tickets: "Tickets",
  tenant_links: "Tenant links",
  whatsapp: "WhatsApp",
  staff_actions: "Staff actions",
  system_actions: "System actions",
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const category = parseAuditCategory(params.category);
  const dateFrom = params.from?.trim() ?? "";
  const dateTo = params.to?.trim() ?? "";
  const data = await getHistoryData();
  const staffById = new Map(data.staff.map((staff) => [staff.user_id, staff]));
  const visibleLogs = filterAuditLogs(data.auditLogs, data.staff, query, {
    category,
    dateFrom,
    dateTo,
  });
  const staffActions = data.auditLogs.filter((log) => log.actor_staff_id).length;
  const systemActions = data.auditLogs.length - staffActions;
  const hasFilters = Boolean(query || dateFrom || dateTo || category !== "all");

  return (
    <main className="min-h-screen bg-[#f6f7f2] pb-16 text-[#17201c] lg:pb-0">
      <div className="flex min-h-screen">
        <AppNavigation active="history" user={data.user} />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[#d8ddd3] bg-[#fbfcf8]/95 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0f7b5f] text-white lg:hidden">
                  <ShieldCheck size={20} aria-hidden />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-normal text-[#12211b]">
                    History
                  </h1>
                  <p className="mt-1 text-sm text-[#637168]">
                    {data.demo
                      ? "Demo data"
                      : data.user?.email ?? data.user?.full_name ?? "Staff workspace"}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Metric label="Audit records" value={data.auditLogs.length} tone="green" />
                <Metric label="Staff actions" value={staffActions} />
                <Metric label="System actions" value={systemActions} />
              </div>
            </div>
            {data.setupIssues.length > 0 ? (
              <div className="mt-4 rounded-md border border-[#e7c87d] bg-[#fff8e5] px-4 py-3 text-sm text-[#72520d]">
                {data.setupIssues[0]}
              </div>
            ) : null}
          </header>

          <section className="flex-1 px-4 py-5 md:px-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {AUDIT_CATEGORIES.map((item) => (
                <FilterPill
                  active={category === item}
                  href={historyHref({ category: item, from: dateFrom, q: query, to: dateTo })}
                  key={item}
                  label={categoryLabels[item]}
                />
              ))}
            </div>

            <form action="/history" className="mb-4 rounded-md border border-[#d8ddd3] bg-white p-3">
              <input name="category" type="hidden" value={category} />
              <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_160px_auto] lg:items-end">
                <label className="relative block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#64726b]">
                    Search
                  </span>
                  <Search
                    className="pointer-events-none absolute left-3 top-[2.55rem] text-[#718078]"
                    size={18}
                    aria-hidden
                  />
                  <input
                    className="field h-11"
                    defaultValue={query}
                    name="q"
                    placeholder="Action, staff, ticket, unit, message, or details"
                    style={{ paddingLeft: "2.75rem" }}
                    type="search"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#64726b]">
                    From
                  </span>
                  <input className="field h-11" defaultValue={dateFrom} name="from" type="date" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#64726b]">
                    To
                  </span>
                  <input className="field h-11" defaultValue={dateTo} name="to" type="date" />
                </label>
                <button
                  className="flex h-11 items-center justify-center rounded-md bg-[#0f7b5f] px-4 text-sm font-semibold text-white transition hover:bg-[#0c684f]"
                  type="submit"
                >
                  Apply
                </button>
              </div>
            </form>

            {hasFilters ? (
              <p className="mb-3 text-sm text-[#637168]">
                Showing {visibleLogs.length} of {data.auditLogs.length} records.
                <Link className="ml-2 font-semibold text-[#0f7b5f] hover:underline" href="/history">
                  Clear filters
                </Link>
              </p>
            ) : null}

            <div className="mb-4 flex justify-end">
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#b9c5bb] bg-white px-3 text-sm font-semibold text-[#23342c] transition hover:bg-[#eef4ec]"
                href={historyExportHref({ category, from: dateFrom, q: query, to: dateTo })}
              >
                <Download size={16} aria-hidden />
                Export CSV
              </Link>
            </div>

            {data.auditLogs.length > 0 ? (
              visibleLogs.length > 0 ? (
                <div className="space-y-3">
                  {visibleLogs.map((log) => (
                    <AuditRow
                      key={log.id}
                      log={log}
                      staff={log.actor_staff_id ? staffById.get(log.actor_staff_id) : null}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-[#cfd8ce] bg-[#fbfcf8] p-8 text-center">
                  <p className="font-semibold text-[#26362e]">No matching history records</p>
                  <p className="mt-1 text-sm text-[#66746c]">
                    Try searching by staff name, ticket number, unit, action, or detail text.
                  </p>
                </div>
              )
            ) : (
              <div className="rounded-md border border-dashed border-[#cfd8ce] bg-[#fbfcf8] p-8 text-center">
                <p className="font-semibold text-[#26362e]">No history yet</p>
                <p className="mt-1 text-sm text-[#66746c]">
                  Audit records will appear here when staff link tenants, create tickets, update cases, or receive WhatsApp messages.
                </p>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function FilterPill({
  active,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-[#0f7b5f] bg-[#e5f3ed] text-[#0f7b5f]"
          : "border-[#d8ddd3] bg-white text-[#526158] hover:bg-[#eef4ec]"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function historyHref({
  category,
  from,
  q,
  to,
}: {
  category: AuditCategory;
  from: string;
  q: string;
  to: string;
}) {
  const params = new URLSearchParams();

  if (category !== "all") {
    params.set("category", category);
  }
  if (q) {
    params.set("q", q);
  }
  if (from) {
    params.set("from", from);
  }
  if (to) {
    params.set("to", to);
  }

  const query = params.toString();

  return query ? `/history?${query}` : "/history";
}

function historyExportHref({
  category,
  from,
  q,
  to,
}: {
  category: AuditCategory;
  from: string;
  q: string;
  to: string;
}) {
  return historyHref({ category, from, q, to }).replace("/history", "/history/export");
}

function AuditRow({ log, staff }: { log: AuditLog; staff: StaffUser | null | undefined }) {
  const actor = staff ? displayStaffName(staff) : "System";
  const metadata = JSON.stringify(log.metadata ?? {}, null, 2);
  const hasMetadata = metadata !== "{}";

  return (
    <article className="rounded-md border border-[#d8ddd3] bg-white px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[#17201c]">{formatAuditAction(log.action)}</p>
            <span className="rounded-md border border-[#d8ddd3] bg-[#fbfcf8] px-2 py-0.5 text-xs font-medium text-[#45564d]">
              {formatAuditAction(log.entity_type)}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#637168]">
            {actor}
            {log.entity_id ? ` · ${compactText(log.entity_id, 36)}` : ""}
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-1.5 text-sm text-[#718078]">
          <Clock3 size={15} aria-hidden />
          {formatDateTime(log.created_at)}
        </p>
      </div>

      {hasMetadata ? (
        <details className="mt-3 rounded-md bg-[#fbfcf8] px-3 py-2 text-sm text-[#4d5c54]">
          <summary className="cursor-pointer font-medium text-[#314239]">Details</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-5 text-[#526158]">
            {metadata}
          </pre>
        </details>
      ) : null}
    </article>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "green";
}) {
  const toneClass = tone === "green" ? "text-[#0f7b5f]" : "text-[#17201c]";

  return (
    <div className="rounded-md border border-[#d8ddd3] bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#6b7871]">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function formatAuditAction(value: string) {
  return value
    .replace(/[._]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
