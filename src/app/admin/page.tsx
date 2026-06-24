import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ClipboardList, Search, ShieldCheck, UsersRound } from "lucide-react";

import {
  adminUpdateTicketAction,
  createStaffAction,
  createTenantAction,
  createUnitAction,
  removeStaffAction,
  updateStaffAction,
  updateTenantAction,
} from "@/app/actions";
import { AppNavigation } from "@/app/app-navigation";
import { buildDataQualityIssues, type DataQualityIssue } from "@/lib/admin-insights";
import { getDashboardData } from "@/lib/data";
import { formatDateTime, formatTicketStatus } from "@/lib/format";
import { displayStaffName, getAssignableStaff, isAdminStaff } from "@/lib/staff";
import { buildStaffWorkload } from "@/lib/staff-workload";
import { filterTicketsByViewAndSearch } from "@/lib/ticket-search";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type MaintenanceTicket,
  type StaffUser,
  type Tenant,
  type TicketPriority,
  type TicketStatus,
  type Unit,
} from "@/lib/types";

type AdminPageProps = {
  searchParams: Promise<{ q?: string; ticketView?: string; view?: string }>;
};

const VIEWS = ["staff", "directory", "tickets", "quality"] as const;
type AdminView = (typeof VIEWS)[number];

const ADMIN_TICKET_VIEWS = ["all", "open", "unassigned", "urgent", "resolved"] as const;
type AdminTicketView = (typeof ADMIN_TICKET_VIEWS)[number];

const LEASE_STATUSES = ["active", "ending_soon", "expired", "past_due"] as const;
const STAFF_ROLES = ["on_site", "manager", "admin", "staff"] as const;

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const view = VIEWS.includes(params.view as AdminView) ? (params.view as AdminView) : "staff";
  const ticketView = ADMIN_TICKET_VIEWS.includes(params.ticketView as AdminTicketView)
    ? (params.ticketView as AdminTicketView)
    : "open";
  const ticketQuery = params.q?.trim() ?? "";
  const data = await getDashboardData();

  if (!isAdminStaff(data.user?.role)) {
    redirect("/");
  }

  const workloadSummary = buildStaffWorkload(data.tickets, data.staff);
  const qualityIssues = buildDataQualityIssues({
    conversations: data.conversations,
    tenants: data.tenants,
    tickets: data.tickets,
    units: data.units,
  });

  return (
    <main className="min-h-screen bg-[#f6f7f2] pb-16 text-[#17201c] lg:pb-0">
      <div className="flex min-h-screen">
        <AppNavigation active="admin" user={data.user} />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[#d8ddd3] bg-[#fbfcf8]/95 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0f7b5f] text-white lg:hidden">
                  <ShieldCheck size={20} aria-hidden />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-normal text-[#12211b]">
                    Admin
                  </h1>
                  <p className="mt-1 text-sm text-[#637168]">
                    Manage staff visibility, tenant directory health, and setup issues.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Metric label="Staff" value={data.staff.length} />
                <Metric label="Units" value={data.units.length} />
                <Metric label="Tenants" value={data.tenants.length} />
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
              <TabPill active={view === "staff"} href="/admin" label="Staff" />
              <TabPill
                active={view === "directory"}
                href="/admin?view=directory"
                label="Tenants & Units"
              />
              <TabPill
                active={view === "tickets"}
                href="/admin?view=tickets"
                label="Tickets"
              />
              <TabPill
                active={view === "quality"}
                href="/admin?view=quality"
                label="Data Quality"
              />
            </div>

            {view === "staff" ? (
              <StaffTab
                currentUser={data.user}
                staff={data.staff}
                workloadSummary={workloadSummary.staffWorkloads}
              />
            ) : null}
            {view === "directory" ? <DirectoryTab tenants={data.tenants} units={data.units} /> : null}
            {view === "tickets" ? (
              <AdminTicketsTab
                query={ticketQuery}
                staff={data.staff}
                tickets={data.tickets}
                view={ticketView}
              />
            ) : null}
            {view === "quality" ? <QualityTab issues={qualityIssues} /> : null}
          </section>
        </section>
      </div>
    </main>
  );
}

function StaffTab({
  currentUser,
  staff,
  workloadSummary,
}: {
  currentUser: StaffUser | null;
  staff: StaffUser[];
  workloadSummary: Array<{ staff: StaffUser; openCount: number; urgentCount: number }>;
}) {
  const workloadByStaff = new Map(workloadSummary.map((item) => [item.staff.user_id, item]));

  return (
    <div className="space-y-5">
      <AdminForm
        title="Add staff"
        subtitle="Add an existing Supabase Auth user to this maintenance system."
      >
        <form action={createStaffAction} className="grid gap-3 xl:grid-cols-[minmax(260px,1.4fr)_minmax(170px,1fr)_minmax(190px,1fr)_160px_auto] xl:items-end">
          <Field label="Supabase Auth UID">
            <input
              className="field"
              name="user_id"
              placeholder="e4a672cf-0f39-4246-a093-f155766b9f4b"
              required
            />
          </Field>
          <Field label="Full name">
            <input className="field" name="full_name" placeholder="Ava Wong" required />
          </Field>
          <Field label="Email">
            <input className="field" name="email" placeholder="ava@example.com" required type="email" />
          </Field>
          <Field label="Role">
            <StaffRoleSelect />
          </Field>
          <SubmitButton label="Add staff" />
        </form>
        <p className="mt-3 text-sm text-[#66746c]">
          This does not create a new login account. Create the user in Supabase Auth first, then add
          the UID here.
        </p>
      </AdminForm>

      <section className="rounded-md border border-[#d8ddd3] bg-white">
        <SectionHeader
          icon={<UsersRound size={18} aria-hidden />}
          title="Staff"
          subtitle="Edit roles, monitor workload, or remove app access."
        />
        <div className="divide-y divide-[#e4e8df]">
          {staff.map((person) => {
            const workload = workloadByStaff.get(person.user_id);
            const isCurrentUser = person.user_id === currentUser?.user_id;

            return (
              <article className="px-4 py-4" key={person.user_id}>
                <form action={updateStaffAction} className="grid gap-3 xl:grid-cols-[minmax(220px,1.2fr)_minmax(170px,1fr)_minmax(190px,1fr)_145px_100px_100px_auto] xl:items-end">
                  <input name="user_id" type="hidden" value={person.user_id} />
                  <div className="min-w-0 xl:self-center">
                    <p className="break-words font-semibold text-[#26362e] [overflow-wrap:anywhere]">
                      {displayStaffName(person)}
                    </p>
                    <p className="mt-1 break-words text-sm text-[#66746c] [overflow-wrap:anywhere]">
                      {person.email ?? person.user_id}
                    </p>
                    {isCurrentUser ? (
                      <p className="mt-1 text-xs font-semibold text-[#0f7b5f]">
                        Current account
                      </p>
                    ) : null}
                  </div>
                  <Field label="Full name">
                    <input
                      className="field"
                      defaultValue={person.full_name ?? ""}
                      name="full_name"
                      required
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      className="field"
                      defaultValue={person.email ?? ""}
                      name="email"
                      required
                      type="email"
                    />
                  </Field>
                  <Field label="Role">
                    <StaffRoleSelect selected={person.role} />
                  </Field>
                  <MetricInline label="Active" value={workload?.openCount ?? 0} />
                  <MetricInline label="Urgent" value={workload?.urgentCount ?? 0} tone="amber" />
                  <button
                    className="flex h-10 items-center justify-center rounded-md border border-[#b9c5bb] bg-white px-3 text-sm font-semibold text-[#23342c] transition hover:bg-[#eef4ec]"
                    type="submit"
                  >
                    Save
                  </button>
                </form>
                <form action={removeStaffAction} className="mt-3 flex justify-end">
                  <input name="user_id" type="hidden" value={person.user_id} />
                  <button
                    className="flex h-9 items-center justify-center rounded-md border border-[#e7aaa3] bg-white px-3 text-sm font-semibold text-[#8d251e] transition hover:bg-[#fee2df] disabled:cursor-not-allowed disabled:border-[#d8ddd3] disabled:text-[#8a958f]"
                    disabled={isCurrentUser}
                    type="submit"
                  >
                    Remove staff
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DirectoryTab({ tenants, units }: { tenants: Tenant[]; units: Unit[] }) {
  const tenantsByUnit = new Map<string, Tenant[]>();

  for (const tenant of tenants) {
    if (!tenant.unit_id) {
      continue;
    }

    tenantsByUnit.set(tenant.unit_id, [...(tenantsByUnit.get(tenant.unit_id) ?? []), tenant]);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-2">
        <AdminForm title="Add unit" subtitle="Create a building/unit record for tenant linking.">
          <form action={createUnitAction} className="space-y-3">
            <Field label="Building / property">
              <input className="field" name="property_name" placeholder="Orchard Square Mall" required />
            </Field>
            <Field label="Unit">
              <input className="field" name="unit_label" placeholder="02-08" required />
            </Field>
            <Field label="Address">
              <input className="field" name="address" placeholder="Optional" />
            </Field>
            <Field label="Notes">
              <textarea className="field min-h-20 resize-none" name="notes" placeholder="Optional" />
            </Field>
            <SubmitButton label="Add unit" />
          </form>
        </AdminForm>

        <AdminForm title="Add tenant" subtitle="Create a tenant and optionally assign it to a unit.">
          <form action={createTenantAction} className="space-y-3">
            <Field label="Tenant contact">
              <input className="field" name="tenant_name" placeholder="Ava Wong" required />
            </Field>
            <Field label="Company">
              <input className="field" name="company_name" placeholder="Bloom & Bean Cafe" />
            </Field>
            <Field label="Phone">
              <input className="field" name="phone_number" placeholder="+65 9000 1001" required />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Unit">
                <UnitSelect units={units} />
              </Field>
              <Field label="Lease">
                <LeaseSelect />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className="field min-h-20 resize-none" name="notes" placeholder="Optional" />
            </Field>
            <SubmitButton label="Add tenant" />
          </form>
        </AdminForm>
      </section>

      <section className="rounded-md border border-[#d8ddd3] bg-white">
        <SectionHeader
          icon={<Building2 size={18} aria-hidden />}
          title="Tenants & Units"
          subtitle="Review and update which tenant is attached to each unit."
        />
        <div className="divide-y divide-[#e4e8df]">
          {units.map((unit) => {
            const unitTenants = tenantsByUnit.get(unit.id) ?? [];

            return (
              <article className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1.2fr)_160px]" key={unit.id}>
                <div>
                  <p className="font-semibold text-[#26362e]">
                    {unit.property_name} {unit.unit_label}
                  </p>
                  <p className="mt-1 text-sm text-[#66746c]">{unit.address ?? "No address"}</p>
                </div>
                <div>
                  {unitTenants.length > 0 ? (
                    unitTenants.map((tenant) => (
                      <p className="break-words text-sm text-[#26362e] [overflow-wrap:anywhere]" key={tenant.id}>
                        {tenant.company_name ?? tenant.tenant_name}
                        <span className="text-[#718078]"> · {tenant.phone_number}</span>
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-[#a36200]">No tenant assigned</p>
                  )}
                </div>
                <StatusBadge
                  label={unitTenants.length > 0 ? `${unitTenants.length} tenant` : "Vacant / missing"}
                  tone={unitTenants.length > 0 ? "green" : "amber"}
                />
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-[#d8ddd3] bg-white">
        <SectionHeader
          icon={<UsersRound size={18} aria-hidden />}
          title="Edit tenants"
          subtitle="Update contact details or move a tenant to another unit."
        />
        <div className="divide-y divide-[#e4e8df]">
          {tenants.map((tenant) => (
            <form action={updateTenantAction} className="grid gap-3 px-4 py-4 xl:grid-cols-[1fr_1fr_170px_170px_auto] xl:items-end" key={tenant.id}>
              <input name="tenant_id" type="hidden" value={tenant.id} />
              <Field label="Tenant / company">
                <input className="field mb-2" defaultValue={tenant.tenant_name} name="tenant_name" required />
                <input className="field" defaultValue={tenant.company_name ?? ""} name="company_name" placeholder="Company" />
              </Field>
              <Field label="Phone / notes">
                <input className="field mb-2" defaultValue={tenant.phone_number} name="phone_number" required />
                <input className="field" defaultValue={tenant.notes ?? ""} name="notes" placeholder="Notes" />
              </Field>
              <Field label="Unit">
                <UnitSelect selectedUnitId={tenant.unit_id} units={units} />
              </Field>
              <Field label="Lease">
                <LeaseSelect selected={tenant.lease_status} />
              </Field>
              <button className="flex h-10 items-center justify-center rounded-md border border-[#b9c5bb] bg-white px-3 text-sm font-semibold text-[#23342c] transition hover:bg-[#eef4ec]" type="submit">
                Save
              </button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminTicketsTab({
  query,
  staff,
  tickets,
  view,
}: {
  query: string;
  staff: StaffUser[];
  tickets: MaintenanceTicket[];
  view: AdminTicketView;
}) {
  const assignableStaff = getAssignableStaff(staff);
  const visibleTickets = filterTicketsByViewAndSearch(tickets, staff, view, query);
  const returnTo = adminTicketHref({ q: query, view });
  const hasFilters = Boolean(query || view !== "open");

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-[#d8ddd3] bg-white">
        <SectionHeader
          icon={<ClipboardList size={18} aria-hidden />}
          title="Ticket Control"
          subtitle="Edit ticket details, ownership, priority, and status from one admin view."
        />
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <TicketFilterPill
              active={view === "all"}
              href={adminTicketHref({ q: query, view: "all" })}
              label="All"
            />
            <TicketFilterPill
              active={view === "open"}
              href={adminTicketHref({ q: query, view: "open" })}
              label="Open"
            />
            <TicketFilterPill
              active={view === "unassigned"}
              href={adminTicketHref({ q: query, view: "unassigned" })}
              label="Unassigned"
            />
            <TicketFilterPill
              active={view === "urgent"}
              href={adminTicketHref({ q: query, view: "urgent" })}
              label="Urgent"
            />
            <TicketFilterPill
              active={view === "resolved"}
              href={adminTicketHref({ q: query, view: "resolved" })}
              label="Resolved"
            />
          </div>

          <form action="/admin" className="rounded-md border border-[#d8ddd3] bg-[#fbfcf8] p-3">
            <input name="view" type="hidden" value="tickets" />
            <input name="ticketView" type="hidden" value={view} />
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
            <p className="text-sm text-[#637168]">
              Showing {visibleTickets.length} of {tickets.length} tickets.
              <Link
                className="ml-2 font-semibold text-[#0f7b5f] hover:underline"
                href="/admin?view=tickets"
              >
                Clear filters
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      {visibleTickets.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#cfd8ce] bg-[#fbfcf8] p-8 text-center">
          <p className="font-semibold text-[#26362e]">No matching tickets</p>
          <p className="mt-1 text-sm text-[#66746c]">
            Try searching by ticket number, tenant, unit, issue, assigned staff, status, or priority.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleTickets.map((ticket) => (
            <AdminTicketForm
              assignableStaff={assignableStaff}
              key={ticket.id}
              returnTo={returnTo}
              staff={staff}
              ticket={ticket}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminTicketForm({
  assignableStaff,
  returnTo,
  staff,
  ticket,
}: {
  assignableStaff: StaffUser[];
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
    <form
      action={adminUpdateTicketAction}
      className="rounded-md border border-[#d8ddd3] bg-white p-4"
    >
      <input name="ticket_id" type="hidden" value={ticket.id} />
      <input name="return_to" type="hidden" value={returnTo} />

      <div className="mb-4 flex flex-col gap-3 border-b border-[#e1e6dc] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#d8ddd3] bg-[#fbfcf8] px-2 py-1 text-xs font-semibold text-[#45564d]">
              #{ticket.ticket_number}
            </span>
            <StatusBadge label={formatTicketStatus(ticket.status)} tone={ticketStatusTone(ticket.status)} />
            <StatusBadge label={formatTicketStatus(ticket.priority)} tone={ticketPriorityTone(ticket.priority)} />
          </div>
          <p className="mt-2 break-words text-sm text-[#526158] [overflow-wrap:anywhere]">
            {tenantName} · {unitName}
          </p>
          <p className="mt-1 text-xs text-[#718078]">
            Updated {formatDateTime(ticket.updated_at)}
            {assignedStaff ? ` · Assigned to ${displayStaffName(assignedStaff)}` : " · Unassigned"}
          </p>
        </div>

        {ticket.source_conversation_id ? (
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#b9c5bb] bg-white px-3 text-sm font-semibold text-[#23342c] transition hover:bg-[#eef4ec]"
            href={relatedMessageHref}
          >
            Open Related Message
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(240px,1.1fr)_170px_180px_190px] xl:items-end">
        <Field label="Title">
          <input className="field" defaultValue={ticket.title} name="title" required />
        </Field>
        <Field label="Description">
          <textarea
            className="field min-h-24 resize-y"
            defaultValue={ticket.description ?? ""}
            name="description"
            placeholder="No description"
          />
        </Field>
        <Field label="Priority">
          <TicketPrioritySelect selected={ticket.priority} />
        </Field>
        <Field label="Status">
          <TicketStatusSelect selected={ticket.status} />
        </Field>
        <Field label="Assigned staff">
          <StaffSelect selectedStaffId={ticket.assigned_staff_id} staff={assignableStaff} />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
        <Field label="Admin note">
          <input
            className="field"
            name="body"
            placeholder="Optional note for ticket history"
          />
        </Field>
        <button
          className="flex h-10 items-center justify-center rounded-md bg-[#0f7b5f] px-4 text-sm font-semibold text-white transition hover:bg-[#0b684f]"
          type="submit"
        >
          Save ticket
        </button>
      </div>
    </form>
  );
}

function QualityTab({ issues }: { issues: DataQualityIssue[] }) {
  return (
    <section className="rounded-md border border-[#d8ddd3] bg-white">
      <SectionHeader
        icon={<ClipboardList size={18} aria-hidden />}
        title="Data Quality"
        subtitle="Shortcuts to records that may need cleanup."
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {issues.map((issue) => (
          <Link
            className="rounded-md border border-[#d8ddd3] bg-[#fbfcf8] p-4 transition hover:bg-[#eef4ec]"
            href={issue.href}
            key={issue.label}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-[#26362e]">{issue.label}</p>
              <StatusBadge label={issue.severity} tone={issue.severity} />
            </div>
            <p className="mt-3 text-3xl font-semibold text-[#17201c]">{issue.count}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  icon,
  subtitle,
  title,
}: {
  icon: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="border-b border-[#e1e6dc] px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-[#0f7b5f]">{icon}</span>
        <h2 className="text-sm font-semibold text-[#1c2b23]">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-[#66746c]">{subtitle}</p>
    </div>
  );
}

function AdminForm({
  children,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-[#d8ddd3] bg-white">
      <SectionHeader
        icon={<ShieldCheck size={18} aria-hidden />}
        subtitle={subtitle}
        title={title}
      />
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#64726b]">
        {label}
      </span>
      {children}
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      className="flex h-10 items-center justify-center rounded-md bg-[#0f7b5f] px-4 text-sm font-semibold text-white transition hover:bg-[#0b684f]"
      type="submit"
    >
      {label}
    </button>
  );
}

function UnitSelect({
  selectedUnitId,
  units,
}: {
  selectedUnitId?: string | null;
  units: Unit[];
}) {
  return (
    <select className="field" defaultValue={selectedUnitId ?? ""} name="unit_id">
      <option value="">No unit</option>
      {units.map((unit) => (
        <option key={unit.id} value={unit.id}>
          {unit.property_name} {unit.unit_label}
        </option>
      ))}
    </select>
  );
}

function LeaseSelect({ selected = "active" }: { selected?: string }) {
  return (
    <select className="field" defaultValue={selected} name="lease_status">
      {LEASE_STATUSES.map((status) => (
        <option key={status} value={status}>
          {formatTicketStatus(status)}
        </option>
      ))}
    </select>
  );
}

function StaffSelect({
  selectedStaffId,
  staff,
}: {
  selectedStaffId?: string | null;
  staff: StaffUser[];
}) {
  return (
    <select className="field" defaultValue={selectedStaffId ?? ""} name="assigned_staff_id">
      <option value="">Unassigned</option>
      {staff.map((person) => (
        <option key={person.user_id} value={person.user_id}>
          {displayStaffName(person)}
        </option>
      ))}
    </select>
  );
}

function StaffRoleSelect({ selected = "on_site" }: { selected?: string }) {
  return (
    <select className="field" defaultValue={selected} name="role">
      {STAFF_ROLES.map((role) => (
        <option key={role} value={role}>
          {formatTicketStatus(role)}
        </option>
      ))}
    </select>
  );
}

function TicketPrioritySelect({ selected }: { selected: TicketPriority }) {
  return (
    <select className="field" defaultValue={selected} name="priority">
      {TICKET_PRIORITIES.map((priority) => (
        <option key={priority} value={priority}>
          {formatTicketStatus(priority)}
        </option>
      ))}
    </select>
  );
}

function TicketStatusSelect({ selected }: { selected: TicketStatus }) {
  return (
    <select className="field" defaultValue={selected} name="status">
      {TICKET_STATUSES.map((status) => (
        <option key={status} value={status}>
          {formatTicketStatus(status)}
        </option>
      ))}
    </select>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#d8ddd3] bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#6b7871]">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-[#17201c]">{value}</p>
    </div>
  );
}

function MetricInline({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "amber" | "neutral";
  value: number;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#718078]">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold ${tone === "amber" ? "text-[#a36200]" : "text-[#17201c]"}`}>
        {value}
      </p>
    </div>
  );
}

function TabPill({
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

function TicketFilterPill({
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

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "amber" | "green" | "neutral" | "red";
}) {
  const className =
    tone === "green"
      ? "border-[#b8dccb] bg-[#e5f3ed] text-[#0f6f57]"
      : tone === "amber"
        ? "border-[#e7c87d] bg-[#fff8e5] text-[#72520d]"
        : tone === "red"
          ? "border-[#e7aaa3] bg-[#fee2df] text-[#8d251e]"
          : "border-[#d8ddd3] bg-[#fbfcf8] text-[#45564d]";

  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function ticketPriorityTone(priority: TicketPriority) {
  if (priority === "urgent") {
    return "red";
  }

  if (priority === "high") {
    return "amber";
  }

  return "neutral";
}

function ticketStatusTone(status: TicketStatus) {
  if (status === "resolved" || status === "closed") {
    return "neutral";
  }

  if (status === "waiting_for_tenant" || status === "waiting_for_vendor") {
    return "amber";
  }

  return "green";
}

function adminTicketHref({ q, view }: { q: string; view: AdminTicketView }) {
  const params = new URLSearchParams({ view: "tickets" });

  if (view !== "open") {
    params.set("ticketView", view);
  }
  if (q) {
    params.set("q", q);
  }

  return `/admin?${params.toString()}`;
}
