import {
  ClipboardList,
  ImageIcon,
  LinkIcon,
  MessageCircle,
  Send,
  ShieldCheck,
  UserRound,
  VideoIcon,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { AppNavigation } from "@/app/app-navigation";
import {
  createTicketAction,
  replyToTenantAction,
  updateTicketAction,
} from "@/app/actions";
import { TenantLinkForm } from "@/app/tenant-link-form";
import { compactText, formatDateTime, formatTicketStatus, initials } from "@/lib/format";
import { getDashboardData } from "@/lib/data";
import { displayStaffName, getAssignableStaff, isOnsiteStaff } from "@/lib/staff";
import { TICKET_PRIORITIES, TICKET_STATUSES, type MaintenanceTicket } from "@/lib/types";

type PageProps = {
  searchParams: Promise<{ conversation?: string; message?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getDashboardData(params.conversation);
  const selectedMessageId = params.message ?? null;
  const selected = data.selectedConversation;
  const linkedTenant = selected?.tenant ?? null;
  const linkedUnit = selected?.unit ?? linkedTenant?.unit ?? null;
  const selectedTickets = data.tickets.filter(
    (ticket) => ticket.source_conversation_id === selected?.id,
  );
  const onsiteStaff = data.staff.filter((staff) => isOnsiteStaff(staff.role));
  const assignableStaff = getAssignableStaff(data.staff);
  const openTicketCount = data.tickets.filter(
    (ticket) => !["resolved", "closed"].includes(ticket.status),
  ).length;
  const unlinkedCount = data.conversations.filter(
    (conversation) => !conversation.tenant_id || !conversation.unit_id,
  ).length;
  const selectedOpenTickets = selectedTickets.filter(
    (ticket) => !["resolved", "closed"].includes(ticket.status),
  );
  const firstInboundMessage = data.messages.find((message) => message.direction === "inbound");
  const defaultTicketTitle = firstInboundMessage?.body
    ? compactText(firstInboundMessage.body, 58)
    : "";
  const unassignedOpenTicketCount = selectedOpenTickets.filter(
    (ticket) => !ticket.assigned_staff_id,
  );
  const tenantLinkStatus =
    linkedTenant && linkedUnit ? "Complete" : linkedTenant || linkedUnit ? "Partial" : "Needed";
  const ticketCreationStatus =
    selectedTickets.length > 0 ? `${selectedTickets.length} created` : "Next step";

  return (
    <main className="min-h-screen bg-[#f6f7f2] pb-16 text-[#17201c] lg:pb-0">
      <div className="flex min-h-screen">
        <AppNavigation active="chat" user={data.user} />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[#d8ddd3] bg-[#fbfcf8]/95 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0f7b5f] text-white lg:hidden">
                    <Wrench size={20} aria-hidden />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-normal text-[#12211b]">
                      Tenant Chat Inbox
                    </h1>
                    <p className="mt-1 text-sm text-[#637168]">
                      {data.demo
                        ? "Demo data"
                        : data.user?.email ?? data.user?.full_name ?? "Staff workspace"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                <Metric label="Conversations" value={data.conversations.length} />
                <Metric label="Unlinked chats" value={unlinkedCount} tone="amber" />
                <Metric label="Open tickets" value={openTicketCount} tone="green" />
                <Metric label="On-site staff" value={onsiteStaff.length} tone="green" />
              </div>
            </div>
            {data.setupIssues.length > 0 ? (
              <div className="mt-4 rounded-md border border-[#e7c87d] bg-[#fff8e5] px-4 py-3 text-sm text-[#72520d]">
                {data.setupIssues[0]}
              </div>
            ) : null}
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_390px]">
            <section className="border-b border-[#d8ddd3] bg-[#fbfcf8] lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-[#d8ddd3] px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#53625b]">
                  WhatsApp
                </h2>
                <span className="rounded-md bg-[#e5f3ed] px-2 py-1 text-xs font-medium text-[#0f7b5f]">
                  Tenant ops
                </span>
              </div>
              <div className="max-h-[42vh] overflow-auto lg:max-h-[calc(100vh-154px)]">
                {data.conversations.length === 0 ? (
                  <EmptyState title="No tenant conversations yet" body="New WhatsApp messages from tenants will appear here." />
                ) : (
                  data.conversations.map((conversation) => (
                    <Link
                      className={`block border-b border-[#e4e8df] px-4 py-4 transition hover:bg-[#eef4ec] ${
                        selected?.id === conversation.id ? "bg-[#e9f4ee]" : ""
                      }`}
                      href={`/?conversation=${conversation.id}`}
                      key={conversation.id}
                      prefetch={false}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-[#15241d]">
                              {conversation.tenant?.tenant_name ??
                                conversation.contact_name ??
                                conversation.tenant_phone}
                            </span>
                            {!conversation.tenant_id ? (
                              <span className="shrink-0 rounded-sm bg-[#ffe6ad] px-1.5 py-0.5 text-[11px] font-medium text-[#704c04]">
                                Link
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-[#68746d]">
                            {conversation.unit
                              ? `${conversation.unit.property_name} ${conversation.unit.unit_label}`
                              : conversation.tenant_phone}
                          </p>
                          <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#40514a]">
                            {conversation.last_message_preview ?? "No message preview"}
                          </p>
                        </div>
                        <time className="shrink-0 text-xs text-[#7c8982]">
                          {formatDateTime(conversation.last_message_at)}
                        </time>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="flex min-h-[720px] min-w-0 flex-col bg-[#ffffff]">
              {selected ? (
                <>
                  <div className="border-b border-[#d8ddd3] px-5 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#e6f1eb] text-[#0f7b5f]">
                            <UserRound size={20} aria-hidden />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-[#12211b]">
                              {linkedTenant?.tenant_name ??
                                selected.contact_name ??
                                selected.tenant_phone}
                            </h2>
                            <p className="text-sm text-[#65736b]">
                              {linkedTenant?.company_name ??
                                linkedUnit?.property_name ??
                                selected.tenant_phone}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill value={selected.status} />
                        {linkedUnit ? (
                          <span className="rounded-md border border-[#d8ddd3] bg-[#fbfcf8] px-2.5 py-1 text-xs font-medium text-[#45564d]">
                            {linkedUnit.unit_label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto bg-[#f7f8f4] px-4 py-5 md:px-6">
                    <div className="mx-auto flex max-w-3xl flex-col gap-4">
                      {data.messages.length === 0 ? (
                        <EmptyState title="No messages in this conversation" body="Once the tenant sends or receives a WhatsApp message, the conversation history will appear here." />
                      ) : (
                        data.messages.map((message) => (
                          <article
                            id={`message-${message.id}`}
                            className={`flex ${
                              message.direction === "outbound"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                            key={message.id}
                          >
                            <div
                              className={`max-w-[min(620px,92%)] rounded-md border px-4 py-3 shadow-sm ${
                                selectedMessageId === message.id
                                  ? "border-[#0f7b5f] bg-[#e9f4ee] ring-2 ring-[#0f7b5f]/25"
                                  : message.direction === "outbound"
                                    ? "border-[#b8dccb] bg-[#dff4ea]"
                                    : "border-[#dce1d8] bg-white"
                              }`}
                            >
                              <div className="mb-2 flex items-center gap-2 text-xs text-[#68746d]">
                                {message.message_type === "image" ? (
                                  <ImageIcon size={14} aria-hidden />
                                ) : message.message_type === "video" ? (
                                  <VideoIcon size={14} aria-hidden />
                                ) : (
                                  <MessageCircle size={14} aria-hidden />
                                )}
                                <span>
                                  {message.direction === "outbound"
                                    ? "Staff reply"
                                    : "Tenant message"}
                                </span>
                                <time>{formatDateTime(message.created_at)}</time>
                              </div>
                              {message.media_url && message.message_type === "image" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  alt="Inbound WhatsApp maintenance attachment"
                                  className="mb-3 aspect-[4/3] w-full rounded-md border border-[#d8ddd3] object-cover"
                                  src={message.media_url}
                                />
                              ) : null}
                              {message.media_url && message.message_type === "video" ? (
                                <video
                                  className="mb-3 aspect-video w-full rounded-md border border-[#d8ddd3] bg-black"
                                  controls
                                  preload="metadata"
                                  src={message.media_url}
                                >
                                  <a href={message.media_url}>Open maintenance video</a>
                                </video>
                              ) : null}
                              <p className="whitespace-pre-wrap text-sm leading-6 text-[#17201c]">
                                {message.body ?? "Unsupported message"}
                              </p>
                              {message.delivery_status === "failed" ? (
                                <p className="mt-2 rounded-sm bg-[#fee2df] px-2 py-1 text-xs text-[#9d261d]">
                                  {message.error_message ?? "Reply failed"}
                                </p>
                              ) : null}
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </div>

                  <form
                    action={replyToTenantAction}
                    className="border-t border-[#d8ddd3] bg-[#fbfcf8] p-4"
                  >
                    <input name="conversation_id" type="hidden" value={selected.id} />
                    <div className="mx-auto flex max-w-3xl gap-3">
                      <label className="sr-only" htmlFor="reply_body">
                        Reply
                      </label>
                      <textarea
                        className="min-h-12 flex-1 resize-none rounded-md border border-[#cbd3c8] bg-white px-3 py-3 text-sm outline-none transition placeholder:text-[#8a958f] focus:border-[#0f7b5f] focus:ring-2 focus:ring-[#0f7b5f]/15"
                        disabled={data.demo}
                        id="reply_body"
                        name="reply_body"
                        placeholder="Reply to tenant on WhatsApp"
                      />
                      <button
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#0f7b5f] text-white transition hover:bg-[#0c684f] disabled:cursor-not-allowed disabled:bg-[#a7b4ad]"
                        disabled={data.demo}
                        title="Send reply"
                        type="submit"
                      >
                        <Send size={18} aria-hidden />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <EmptyState title="Select a tenant conversation" body="Choose a WhatsApp thread from the left to review messages, link the tenant, or create a ticket." />
                </div>
              )}
            </section>

            <aside className="border-t border-[#d8ddd3] bg-[#fbfcf8] xl:border-l xl:border-t-0">
              <div className="max-h-none overflow-auto xl:max-h-[calc(100vh-105px)]">
                {selected ? (
                  <div className="space-y-5 p-4">
                    <Panel title="Current case context" icon={<UserRound size={16} aria-hidden />}>
                      <div className="grid min-w-0 gap-3 text-sm">
                        <ContextLine
                          label="Tenant"
                          value={linkedTenant?.tenant_name ?? selected.contact_name ?? "Unlinked"}
                        />
                        <ContextLine
                          label="Unit"
                          value={
                            linkedUnit
                              ? `${linkedUnit.property_name} ${linkedUnit.unit_label}`
                              : "Unlinked"
                          }
                        />
                        <ContextLine
                          label="Open tickets"
                          value={`${selectedOpenTickets.length} open${
                            unassignedOpenTicketCount.length > 0
                              ? ` · ${unassignedOpenTicketCount.length} unassigned`
                              : ""
                          }`}
                        />
                        {selectedOpenTickets.length > 0 ? (
                          <div className="min-w-0 space-y-2 rounded-md bg-[#fbfcf8] px-3 py-2">
                            <p className="min-w-0 break-words text-xs font-medium uppercase tracking-[0.08em] text-[#718078] [overflow-wrap:anywhere]">
                              Ticket owners
                            </p>
                            <div className="min-w-0 space-y-2">
                              {selectedOpenTickets.map((ticket) => {
                                const staff = assignableStaff.find(
                                  (person) => person.user_id === ticket.assigned_staff_id,
                                );

                                return (
                                  <div className="min-w-0 text-sm" key={ticket.id}>
                                    <p className="min-w-0 break-words text-[#26362e] [overflow-wrap:anywhere]">
                                      #{ticket.ticket_number} {ticket.title}
                                    </p>
                                    <p className="mt-0.5 min-w-0 break-words font-medium text-[#0f7b5f] [overflow-wrap:anywhere]">
                                      {staff ? displayStaffName(staff) : "Unassigned"}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </Panel>

                    <WorkflowPanel
                      description="Confirm who sent the WhatsApp message and which unit it belongs to."
                      icon={<LinkIcon size={16} aria-hidden />}
                      step="1"
                      status={tenantLinkStatus}
                      title="Link tenant and unit"
                    >
                      <TenantLinkForm
                        conversationId={selected.id}
                        demo={data.demo}
                        selectedTenantId={selected.tenant_id}
                        selectedUnitId={selected.unit_id ?? linkedTenant?.unit_id ?? null}
                        tenants={data.tenants}
                        units={data.units}
                      />
                    </WorkflowPanel>

                    <WorkflowPanel
                      description={
                        linkedTenant && linkedUnit
                          ? "Create one ticket per maintenance issue so staff can track each problem separately."
                          : "Linking first is recommended. If the tenant is unknown, you can still create the ticket and link it later."
                      }
                      icon={<ClipboardList size={16} aria-hidden />}
                      step="2"
                      status={ticketCreationStatus}
                      title="Create a ticket"
                    >
                      <form
                        action={createTicketAction}
                        className="space-y-3"
                        key={selected.id}
                      >
                        <input name="conversation_id" type="hidden" value={selected.id} />
                        <Field label="Source message">
                          <select
                            className="field"
                            disabled={data.demo}
                            name="source_message_id"
                          >
                            <option value="">Conversation only</option>
                            {data.messages.map((message) => (
                              <option key={message.id} value={message.id}>
                                {message.message_type} · {compactText(message.body, 42)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Title">
                          <input
                            className="field"
                            defaultValue={defaultTicketTitle}
                            disabled={data.demo}
                            name="title"
                            placeholder="Maintenance issue"
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            className="field min-h-24 resize-none"
                            disabled={data.demo}
                            name="description"
                            placeholder="What needs to be fixed"
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Priority">
                            <select
                              className="field"
                              defaultValue="normal"
                              disabled={data.demo}
                              name="priority"
                            >
                              {TICKET_PRIORITIES.map((priority) => (
                                <option key={priority} value={priority}>
                                  {formatTicketStatus(priority)}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Assign">
                            <select
                              className="field"
                              disabled={data.demo}
                              name="assigned_staff_id"
                            >
                              <option value="">Assign later</option>
                              {assignableStaff.map((staff) => (
                                <option key={staff.user_id} value={staff.user_id}>
                                  {displayStaffName(staff)}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <SubmitButton disabled={data.demo} label="Create ticket" />
                      </form>
                    </WorkflowPanel>

                    <WorkflowPanel
                      description="Update ownership and status as the on-site team works through each case."
                      icon={<Wrench size={16} aria-hidden />}
                      step="3"
                      status={
                        selectedOpenTickets.length > 0
                          ? `${selectedOpenTickets.length} open`
                          : "No open tickets"
                      }
                      title="Manage tickets"
                    >
                      {selectedTickets.length === 0 ? (
                        <p className="text-sm text-[#66746c]">
                          No ticket has been created from this conversation yet.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {selectedTickets.map((ticket) => (
                            <TicketEditor
                              conversationId={selected.id}
                              demo={data.demo}
                              key={ticket.id}
                              staff={assignableStaff}
                              ticket={ticket}
                            />
                          ))}
                        </div>
                      )}
                    </WorkflowPanel>

                    <Panel title="History" icon={<ShieldCheck size={16} aria-hidden />}>
                      <div className="space-y-3">
                        {data.ticketUpdates.slice(0, 5).map((update) => (
                          <div
                            className="border-l-2 border-[#88c3a4] pl-3 text-sm"
                            key={update.id}
                          >
                            <p className="font-medium text-[#1f3028]">
                              {formatTicketStatus(update.update_type)}
                            </p>
                            <p className="text-xs text-[#718078]">
                              {formatDateTime(update.created_at)}
                            </p>
                            {update.body ? (
                              <p className="mt-1 text-[#4a5b52]">{update.body}</p>
                            ) : null}
                          </div>
                        ))}
                        {data.ticketUpdates.length === 0 ? (
                          <p className="text-sm text-[#66746c]">
                            Ticket updates for this conversation will appear here.
                          </p>
                        ) : null}
                      </div>
                    </Panel>

                    <Panel title="On-site team" icon={<UserRound size={16} aria-hidden />}>
                      <div className="space-y-2">
                        {onsiteStaff.length === 0 ? (
                          <p className="text-sm text-[#66746c]">
                            Add staff profiles with the role on_site to assign cases to the mall team.
                          </p>
                        ) : (
                          onsiteStaff.map((staff) => (
                            <div
                              className="flex items-center gap-3 rounded-md border border-[#e1e6dc] bg-[#fbfcf8] px-3 py-2"
                              key={staff.user_id}
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e5f3ed] text-xs font-semibold text-[#0f7b5f]">
                                {initials(staff.full_name ?? staff.email)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#26362e]">
                                  {displayStaffName(staff)}
                                </p>
                                <p className="text-xs text-[#718078]">On-site staff</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Panel>
                  </div>
                ) : (
                  <div className="p-4">
                    <EmptyState title="No case context" body="Select a conversation to see tenant, unit, ticket, and staff details." />
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
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

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] gap-3 rounded-md bg-[#fbfcf8] px-3 py-2">
      <span className="min-w-0 break-words text-xs font-medium uppercase tracking-[0.08em] text-[#718078] [overflow-wrap:anywhere]">
        {label}
      </span>
      <span className="min-w-0 break-words text-right font-medium text-[#26362e] [overflow-wrap:anywhere]">
        {value}
      </span>
    </div>
  );
}

function Panel({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-[#d8ddd3] bg-white">
      <div className="flex items-center gap-2 border-b border-[#e1e6dc] px-4 py-3">
        <span className="text-[#0f7b5f]">{icon}</span>
        <h3 className="text-sm font-semibold text-[#1c2b23]">{title}</h3>
      </div>
      <div className="min-w-0 p-4">{children}</div>
    </section>
  );
}

function WorkflowPanel({
  children,
  description,
  icon,
  status,
  step,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  status: string;
  step: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-[#d8ddd3] bg-white">
      <div className="border-b border-[#e1e6dc] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e5f3ed] text-xs font-semibold text-[#0f7b5f]">
              {step}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[#0f7b5f]">{icon}</span>
                <h3 className="text-sm font-semibold text-[#1c2b23]">{title}</h3>
              </div>
              <p className="mt-1 text-sm leading-5 text-[#66746c]">{description}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-md border border-[#d8ddd3] bg-[#fbfcf8] px-2 py-1 text-xs font-semibold text-[#45564d]">
            {status}
          </span>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#64726b]">
        {label}
      </span>
      {children}
    </label>
  );
}

function SubmitButton({ disabled, label }: { disabled?: boolean; label: string }) {
  return (
    <button
      className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#0f7b5f] px-3 text-sm font-semibold text-white transition hover:bg-[#0c684f] disabled:cursor-not-allowed disabled:bg-[#a7b4ad]"
      disabled={disabled}
      type="submit"
    >
      <ClipboardList size={16} aria-hidden />
      {label}
    </button>
  );
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-md border border-dashed border-[#cfd8ce] bg-[#fbfcf8] p-6 text-center">
      <p className="font-semibold text-[#26362e]">{title}</p>
      <p className="mt-1 text-sm text-[#66746c]">{body}</p>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className={statusClass(value)}>
      {formatTicketStatus(value)}
    </span>
  );
}

function AssignmentBadge({
  staff,
}: {
  staff: { full_name: string | null; email?: string | null } | undefined;
}) {
  if (!staff) {
    return (
      <p className="mb-3 rounded-md border border-[#e7c87d] bg-[#fff8e5] px-2.5 py-1 text-xs font-semibold text-[#72520d]">
        Unassigned
      </p>
    );
  }

  return (
    <p className="mb-3 rounded-md border border-[#b8dccb] bg-[#e5f3ed] px-2.5 py-1 text-xs font-semibold text-[#0f6f57]">
      Assigned to {displayStaffName(staff)}
    </p>
  );
}

function TicketEditor({
  conversationId,
  demo,
  staff,
  ticket,
}: {
  conversationId: string;
  demo: boolean;
  staff: Array<{ user_id: string; full_name: string | null; email?: string | null }>;
  ticket: MaintenanceTicket;
}) {
  const assignedStaff = staff.find((person) => person.user_id === ticket.assigned_staff_id);

  return (
    <form action={updateTicketAction} className="rounded-md border border-[#dfe5da] bg-[#fbfcf8] p-3">
      <input name="ticket_id" type="hidden" value={ticket.id} />
      <input name="conversation_id" type="hidden" value={conversationId} />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#17201c]">
            #{ticket.ticket_number} {ticket.title}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill value={ticket.status} />
            <span className="rounded-md border border-[#d8ddd3] bg-white px-2 py-0.5 text-xs font-medium text-[#45564d]">
              {formatTicketStatus(ticket.priority)} priority
            </span>
          </div>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e5f3ed] text-xs font-semibold text-[#0f7b5f]">
          {assignedStaff ? initials(assignedStaff.full_name ?? assignedStaff.email) : "--"}
        </span>
      </div>
      <AssignmentBadge staff={assignedStaff} />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="field"
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
        <select
          className="field"
          defaultValue={ticket.assigned_staff_id ?? ""}
          disabled={demo}
          name="assigned_staff_id"
        >
          <option value="">Unassigned</option>
          {staff.map((person) => (
            <option key={person.user_id} value={person.user_id}>
              {displayStaffName(person)}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="field mt-2 min-h-16 resize-none"
        disabled={demo}
        name="body"
        placeholder="Ticket update"
      />
      <button
        className="mt-2 flex h-9 w-full items-center justify-center rounded-md border border-[#b9c5bb] bg-white text-sm font-semibold text-[#23342c] transition hover:bg-[#eef4ec] disabled:cursor-not-allowed disabled:text-[#8a958f]"
        disabled={demo}
        type="submit"
      >
        Save ticket
      </button>
    </form>
  );
}

function statusClass(status: string) {
  const className =
    status === "open" || status === "triaging"
      ? "border-[#b8dccb] bg-[#e5f3ed] text-[#0f6f57]"
      : status === "assigned"
        ? "border-[#bccbd2] bg-[#edf4f6] text-[#365563]"
        : status === "waiting_for_tenant" || status === "waiting_for_vendor"
          ? "border-[#e7c87d] bg-[#fff8e5] text-[#72520d]"
          : "border-[#d8ddd3] bg-[#eef1eb] text-[#64726b]";

  return `rounded-md border px-2.5 py-1 text-xs font-semibold ${className}`;
}
