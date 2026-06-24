import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";

import { AppNavigation } from "@/app/app-navigation";
import { updateTicketAction } from "@/app/actions";
import { getDashboardData } from "@/lib/data";
import { formatDateTime, formatTicketStatus, initials } from "@/lib/format";
import { displayStaffName, getAssignableStaff } from "@/lib/staff";
import { buildStaffWorkload, type StaffWorkload } from "@/lib/staff-workload";
import { filterTicketsByViewAndSearch, isOpenStatus } from "@/lib/ticket-search";
import {
  TICKET_STATUSES,
  type MaintenanceTicket,
  type StaffUser,
  type TicketStatus,
} from "@/lib/types";

type TicketsPageProps = {
  searchParams: Promise<{ q?: string; view?: string }>;
};

const VIEWS = ["all", "open", "unassigned", "urgent", "resolved"] as const;
type TicketView = (typeof VIEWS)[number];

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const params = await searchParams;
  const view = VIEWS.includes(params.view as TicketView)
    ? (params.view as TicketView)
    : "open";
  const query = params.q?.trim() ?? "";
  const data = await getDashboardData();
  const assignableStaff = getAssignableStaff(data.staff);
  const workloadSummary = buildStaffWorkload(data.tickets, assignableStaff);
  const openTickets = data.tickets.filter((ticket) => isOpenStatus(ticket.status));
  const unassignedTickets = data.tickets.filter((ticket) => !ticket.assigned_staff_id);
  const urgentTickets = data.tickets.filter((ticket) => ticket.priority === "urgent");
  const resolvedTickets = data.tickets.filter((ticket) =>
    ["resolved", "closed"].includes(ticket.status),
  );
  const visibleTickets = filterTicketsByViewAndSearch(data.tickets, data.staff, view, query);
  const returnTo = ticketsHref({ q: query, view });
  const hasFilters = Boolean(query || view !== "open");

  return (
    <main className="min-h-screen bg-[#f6f7f2] pb-16 text-[#17201c] lg:pb-0">
      <div className="flex min-h-screen">
        <AppNavigation active="tickets" user={data.user} />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[#d8ddd3] bg-[#fbfcf8]/95 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0f7b5f] text-white lg:hidden">
                  <ClipboardList size={20} aria-hidden />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-normal text-[#12211b]">
                    Tickets
                  </h1>
                  <p className="mt-1 text-sm text-[#637168]">
                    {data.demo
                      ? "Demo data"
                      : data.user?.email ?? data.user?.full_name ?? "Staff workspace"}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                <Metric label="Open" value={openTickets.length} tone="green" />
                <Metric label="Unassigned" value={unassignedTickets.length} tone="amber" />
                <Metric label="Urgent" value={urgentTickets.length} tone="amber" />
                <Metric label="Resolved" value={resolvedTickets.length} />
              </div>
            </div>
            {data.setupIssues.length > 0 ? (
              <div className="mt-4 rounded-md border border-[#e7c87d] bg-[#fff8e5] px-4 py-3 text-sm text-[#72520d]">
                {data.setupIssues[0]}
              </div>
            ) : null}
          </header>

          <section className="flex-1 px-4 py-5 md:px-6">
            <section className="mb-5 rounded-md border border-[#d8ddd3] bg-white">
              <div className="border-b border-[#e1e6dc] px-4 py-3">
                <h2 className="text-sm font-semibold text-[#1c2b23]">Staff workload</h2>
                <p className="mt-1 text-sm text-[#66746c]">
                  Active tickets assigned to the on-site team, excluding resolved and closed cases.
                </p>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                <UnassignedWorkloadCard
                  openCount={workloadSummary.unassignedOpenCount}
                  urgentCount={workloadSummary.unassignedUrgentCount}
                />
                {workloadSummary.staffWorkloads.map((workload) => (
                  <StaffWorkloadCard key={workload.staff.user_id} workload={workload} />
                ))}
              </div>
            </section>

            <div className="mb-4 flex flex-wrap gap-2">
              <FilterPill
                active={view === "all"}
                href={ticketsHref({ q: query, view: "all" })}
                label="All"
              />
              <FilterPill
                active={view === "open"}
                href={ticketsHref({ q: query, view: "open" })}
                label="Open"
              />
              <FilterPill
                active={view === "unassigned"}
                href={ticketsHref({ q: query, view: "unassigned" })}
                label="Unassigned"
              />
              <FilterPill
                active={view === "urgent"}
                href={ticketsHref({ q: query, view: "urgent" })}
                label="Urgent"
              />
              <FilterPill
                active={view === "resolved"}
                href={ticketsHref({ q: query, view: "resolved" })}
                label="Resolved"
              />
            </div>

            <form action="/tickets" className="mb-4 rounded-md border border-[#d8ddd3] bg-white p-3">
              <input name="view" type="hidden" value={view} />
              <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-end">
                <label className="relative block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#64726b]">
                    Search tickets
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
                    placeholder="Ticket number, tenant, unit, issue, staff, status, or priority"
                    style={{ paddingLeft: "2.75rem" }}
                    type="search"
                  />
                </label>
                <button
                  className="flex h-11 items-center justify-center rounded-md bg-[#0f7b5f] px-4 text-sm font-semibold text-white transition hover:bg-[#0c684f]"
                  type="submit"
                >
                  Search
                </button>
              </div>
            </form>

            {hasFilters ? (
              <p className="mb-3 text-sm text-[#637168]">
                Showing {visibleTickets.length} of {data.tickets.length} tickets.
                <Link className="ml-2 font-semibold text-[#0f7b5f] hover:underline" href="/tickets">
                  Clear filters
                </Link>
              </p>
            ) : null}

            {visibleTickets.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#cfd8ce] bg-[#fbfcf8] p-8 text-center">
                <p className="font-semibold text-[#26362e]">No matching tickets</p>
                <p className="mt-1 text-sm text-[#66746c]">
                  Try searching by ticket number, tenant, unit, issue, assigned staff, status, or priority.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-[#d8ddd3] bg-white">
                <div className="grid grid-cols-[minmax(240px,1.7fr)_minmax(170px,1fr)_140px_140px_160px] gap-3 border-b border-[#e1e6dc] bg-[#fbfcf8] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#64726b] max-xl:hidden">
                  <span>Case</span>
                  <span>Tenant / unit</span>
                  <span>Priority</span>
                  <span>Updated</span>
                  <span>Assigned</span>
                </div>
                <div className="divide-y divide-[#e4e8df]">
                  {visibleTickets.map((ticket) => (
                    <TicketRow
                      assignableStaff={assignableStaff}
                      demo={data.demo}
                      key={ticket.id}
                      returnTo={returnTo}
                      staff={data.staff}
                      ticket={ticket}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function TicketRow({
  assignableStaff,
  demo,
  returnTo,
  staff,
  ticket,
}: {
  assignableStaff: StaffUser[];
  demo: boolean;
  returnTo: string;
  staff: StaffUser[];
  ticket: MaintenanceTicket;
}) {
  const assignedStaff = staff.find((person) => person.user_id === ticket.assigned_staff_id);
  const tenantName = ticket.tenant?.tenant_name ?? "Unlinked tenant";
  const unitName = ticket.unit
    ? `${ticket.unit.property_name} ${ticket.unit.unit_label}`
    : "Unlinked unit";
  const relatedMessageHref = ticket.source_message_id
    ? `/?conversation=${ticket.source_conversation_id}&message=${ticket.source_message_id}#message-${ticket.source_message_id}`
    : `/?conversation=${ticket.source_conversation_id}`;

  return (
    <article className="grid gap-3 px-4 py-4 xl:grid-cols-[minmax(240px,1.7fr)_minmax(170px,1fr)_140px_140px_160px] xl:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#17201c]">
            #{ticket.ticket_number} {ticket.title}
          </span>
          <StatusPill value={ticket.status} />
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#526158]">
          {ticket.description ?? "No description"}
        </p>
        {ticket.source_message ? (
          <div className="mt-3 rounded-md border border-[#d8ddd3] bg-[#fbfcf8] px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#718078]">
              Related message
            </p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#40514a]">
              {ticket.source_message.body ??
                `${formatTicketStatus(ticket.source_message.message_type)} message`}
            </p>
            <p className="mt-1 text-xs text-[#718078]">
              {ticket.source_message.direction === "outbound" ? "Staff reply" : "Tenant message"} ·{" "}
              {formatDateTime(ticket.source_message.created_at)}
            </p>
          </div>
        ) : null}
        {ticket.source_conversation_id ? (
          <Link
            className="mt-2 inline-flex text-xs font-medium text-[#0f7b5f] hover:text-[#0c684f]"
            href={relatedMessageHref}
          >
            Open Related Message
          </Link>
        ) : null}
      </div>

      <div className="text-sm text-[#526158]">
        <p className="font-medium text-[#26362e]">{tenantName}</p>
        <p className="mt-1">{unitName}</p>
      </div>

      <div>
        <span className={priorityClass(ticket.priority)}>
          {formatTicketStatus(ticket.priority)}
        </span>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#718078]">
          Last updated
        </p>
        <time className="mt-1 block text-sm font-medium text-[#26362e]">
          {formatDateTime(ticket.updated_at)}
        </time>
      </div>

      <form action={updateTicketAction} className="space-y-2">
        <input name="ticket_id" type="hidden" value={ticket.id} />
        <input name="conversation_id" type="hidden" value={ticket.source_conversation_id ?? ""} />
        <input name="return_to" type="hidden" value={returnTo} />
        <AssignmentBadge staff={assignedStaff} />
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e5f3ed] text-xs font-semibold text-[#0f7b5f]">
            {assignedStaff ? initials(assignedStaff.full_name ?? assignedStaff.email) : "--"}
          </span>
          <select
            className="field h-10 min-h-10 py-2"
            defaultValue={ticket.assigned_staff_id ?? ""}
            disabled={demo}
            name="assigned_staff_id"
          >
            <option value="">Unassigned</option>
            {assignableStaff.map((person) => (
              <option key={person.user_id} value={person.user_id}>
                {displayStaffName(person)}
              </option>
            ))}
          </select>
        </div>
        <select
          className="field h-10 min-h-10 py-2"
          defaultValue={ticket.status}
          disabled={demo}
          name="status"
        >
          {TICKET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatTicketStatus(status)}
            </option>
          ))}
        </select>
        <input
          className="field h-10 min-h-10 py-2"
          disabled={demo}
          name="body"
          placeholder="Update note"
        />
        <button
          className="flex h-9 w-full items-center justify-center rounded-md border border-[#b9c5bb] bg-white text-sm font-semibold text-[#23342c] transition hover:bg-[#eef4ec] disabled:cursor-not-allowed disabled:text-[#8a958f]"
          disabled={demo}
          type="submit"
        >
          Save
        </button>
      </form>
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
  tone?: "neutral" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "text-[#0f7b5f]"
      : tone === "amber"
        ? "text-[#a36200]"
        : "text-[#17201c]";

  return (
    <div className="rounded-md border border-[#d8ddd3] bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#6b7871]">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function UnassignedWorkloadCard({
  openCount,
  urgentCount,
}: {
  openCount: number;
  urgentCount: number;
}) {
  return (
    <Link
      className="rounded-md border border-[#e7c87d] bg-[#fff8e5] p-3 transition hover:bg-[#fff2cc]"
      href="/tickets?view=unassigned"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#72520d]">Unassigned</p>
          <p className="mt-1 text-xs text-[#8a6a24]">Needs owner</p>
        </div>
        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-[#72520d]">
          {urgentCount} urgent
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#72520d]">{openCount}</p>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a6a24]">
        Active tickets
      </p>
    </Link>
  );
}

function StaffWorkloadCard({ workload }: { workload: StaffWorkload }) {
  const busy = workload.openCount >= 4;

  return (
    <div className="rounded-md border border-[#d8ddd3] bg-[#fbfcf8] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#26362e]">
            {displayStaffName(workload.staff)}
          </p>
          <p className="mt-1 text-xs text-[#718078]">
            {busy ? "High load" : workload.openCount > 0 ? "Active" : "Available"}
          </p>
        </div>
        <span
          className={`rounded-md px-2 py-1 text-xs font-semibold ${
            workload.urgentCount > 0
              ? "bg-[#fee2df] text-[#8d251e]"
              : "bg-[#e5f3ed] text-[#0f6f57]"
          }`}
        >
          {workload.urgentCount} urgent
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#17201c]">{workload.openCount}</p>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#718078]">
        Active tickets
      </p>
    </div>
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

function StatusPill({ value }: { value: TicketStatus }) {
  return (
    <span className={statusClass(value)}>
      {formatTicketStatus(value)}
    </span>
  );
}

function AssignmentBadge({ staff }: { staff: StaffUser | undefined }) {
  if (!staff) {
    return (
      <span className="inline-flex w-full items-center justify-center rounded-md border border-[#e7c87d] bg-[#fff8e5] px-2.5 py-1 text-xs font-semibold text-[#72520d]">
        Unassigned
      </span>
    );
  }

  return (
    <span className="inline-flex w-full items-center justify-center rounded-md border border-[#b8dccb] bg-[#e5f3ed] px-2.5 py-1 text-xs font-semibold text-[#0f6f57]">
      Assigned to {displayStaffName(staff)}
    </span>
  );
}

function priorityClass(priority: MaintenanceTicket["priority"]) {
  const className =
    priority === "urgent"
      ? "border-[#e7aaa3] bg-[#fee2df] text-[#8d251e]"
      : priority === "high"
        ? "border-[#e7c87d] bg-[#fff8e5] text-[#72520d]"
        : "border-[#d8ddd3] bg-[#fbfcf8] text-[#45564d]";

  return `inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${className}`;
}

function statusClass(status: TicketStatus) {
  const className =
    status === "open" || status === "triaging"
      ? "border-[#b8dccb] bg-[#e5f3ed] text-[#0f6f57]"
      : status === "assigned"
        ? "border-[#bccbd2] bg-[#edf4f6] text-[#365563]"
        : status === "waiting_for_tenant" || status === "waiting_for_vendor"
          ? "border-[#e7c87d] bg-[#fff8e5] text-[#72520d]"
          : "border-[#d8ddd3] bg-[#eef1eb] text-[#64726b]";

  return `rounded-md border px-2 py-0.5 text-xs font-semibold ${className}`;
}

function ticketsHref({ q, view }: { q: string; view: TicketView }) {
  const params = new URLSearchParams();

  if (view !== "open") {
    params.set("view", view);
  }
  if (q) {
    params.set("q", q);
  }

  const query = params.toString();

  return query ? `/tickets?${query}` : "/tickets";
}
