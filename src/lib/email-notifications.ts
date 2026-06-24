import type { SupabaseClient } from "@supabase/supabase-js";

import { getEmailNotificationConfig } from "@/lib/env";

type NewTenantMessageNotification = {
  body: string | null;
  contactName: string | null;
  conversationId: string;
  messageId: string;
  messageType: string;
  tenantPhone: string;
};

type StaffEmailRow = {
  email: string | null;
  full_name: string | null;
  role: string;
  user_id: string;
};

export async function notifyStaffOfNewTenantMessage(
  supabase: SupabaseClient,
  notification: NewTenantMessageNotification,
) {
  const config = getEmailNotificationConfig();

  if (!config.configured) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured" };
  }

  const { data, error } = await supabase
    .from("staff_users")
    .select("user_id, full_name, role, email")
    .in("role", ["admin", "manager", "on_site"])
    .not("email", "is", null);

  if (error) {
    throw error;
  }

  const recipients = uniqueEmails((data as StaffEmailRow[] | null) ?? []);

  if (recipients.length === 0) {
    return { skipped: true, reason: "No staff notification emails are configured" };
  }

  const appHref = buildConversationHref(config.appUrl, notification.conversationId);
  const subject = `New tenant service request from ${notification.contactName ?? notification.tenantPhone}`;
  const html = renderNewTenantMessageEmail(notification, appHref);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: recipients,
      subject,
      html,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? payload.name ?? "Resend notification failed.");
  }

  return {
    skipped: false,
    resendEmailId: payload.id ?? null,
    recipientCount: recipients.length,
  };
}

function uniqueEmails(staff: StaffEmailRow[]) {
  return Array.from(
    new Set(
      staff
        .map((person) => person.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ),
  );
}

function buildConversationHref(appUrl: string | undefined, conversationId: string) {
  if (!appUrl) {
    return null;
  }

  const normalizedAppUrl = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;
  const url = new URL(normalizedAppUrl);
  url.searchParams.set("conversation", conversationId);

  return url.toString();
}

function renderNewTenantMessageEmail(
  notification: NewTenantMessageNotification,
  appHref: string | null,
) {
  const title = escapeHtml(notification.contactName ?? notification.tenantPhone);
  const body = escapeHtml(
    notification.body ??
      `${formatMessageType(notification.messageType)} message received. Open the inbox to review it.`,
  );
  const phone = escapeHtml(notification.tenantPhone);
  const messageType = escapeHtml(formatMessageType(notification.messageType));

  return `
    <div style="font-family:Arial,sans-serif;background:#f6f7f2;padding:24px;color:#17201c;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d8ddd3;border-radius:8px;padding:24px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64726b;">Tenant Maintenance Requests</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#12211b;">New tenant service request</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#26362e;"><strong>${title}</strong> sent a ${messageType} message from ${phone}.</p>
        <div style="border-left:4px solid #0f7b5f;background:#fbfcf8;padding:12px 14px;margin:0 0 20px;">
          <p style="margin:0;font-size:15px;line-height:1.5;color:#26362e;">${body}</p>
        </div>
        ${
          appHref
            ? `<p style="margin:0;"><a href="${escapeHtml(appHref)}" style="display:inline-block;background:#0f7b5f;color:#ffffff;text-decoration:none;border-radius:6px;padding:10px 14px;font-size:14px;font-weight:700;">Open chat</a></p>`
            : `<p style="margin:0;font-size:13px;color:#64726b;">Open the tenant maintenance inbox to review the chat.</p>`
        }
      </div>
    </div>
  `;
}

function formatMessageType(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
