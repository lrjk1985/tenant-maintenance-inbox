import crypto from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { notifyStaffOfNewTenantMessage } from "@/lib/email-notifications";
import { getWhatsAppConfig } from "@/lib/env";
import { normalizePhoneNumber } from "@/lib/format";

const MEDIA_BUCKET = "maintenance-media";

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{
          wa_id?: string;
          profile?: { name?: string };
        }>;
        messages?: WhatsAppInboundMessage[];
      };
    }>;
  }>;
};

type WhatsAppInboundMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  image?: {
    id?: string;
    caption?: string;
    mime_type?: string;
    sha256?: string;
  };
  video?: {
    id?: string;
    caption?: string;
    mime_type?: string;
    sha256?: string;
  };
};

export function verifyWhatsAppSignature(rawBody: string, signature: string | null) {
  const { appSecret } = getWhatsAppConfig();

  if (!appSecret) {
    return true;
  }

  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const received = signature.slice("sha256=".length);

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function ingestWhatsAppWebhook(
  supabase: SupabaseClient,
  payload: WhatsAppWebhookPayload,
) {
  const processed: Array<{ messageId: string; conversationId: string }> = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const contacts = value?.contacts ?? [];

      for (const message of value?.messages ?? []) {
        const contact = contacts.find((item) => item.wa_id === message.from) ?? contacts[0];
        const result = await ingestInboundMessage(supabase, message, contact);

        if (result) {
          processed.push(result);
        }
      }
    }
  }

  return processed;
}

async function ingestInboundMessage(
  supabase: SupabaseClient,
  message: WhatsAppInboundMessage,
  contact?: { wa_id?: string; profile?: { name?: string } },
) {
  const normalizedPhone = normalizePhoneNumber(contact?.wa_id ?? message.from);
  const tenantPhone = normalizedPhone ? `+${normalizedPhone}` : message.from;
  const receivedAt = message.timestamp
    ? new Date(Number(message.timestamp) * 1000).toISOString()
    : new Date().toISOString();

  const { data: existingMessage } = await supabase
    .from("whatsapp_messages")
    .select("id, conversation_id")
    .eq("whatsapp_message_id", message.id)
    .maybeSingle();

  if (existingMessage) {
    return {
      messageId: existingMessage.id as string,
      conversationId: existingMessage.conversation_id as string,
    };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, unit_id")
    .eq("normalized_phone", normalizedPhone)
    .maybeSingle();

  const preview = getMessagePreview(message);

  const { data: conversation, error: conversationError } = await supabase
    .from("whatsapp_conversations")
    .upsert(
      {
        wa_id: contact?.wa_id ?? message.from,
        tenant_phone: tenantPhone,
        contact_name: contact?.profile?.name ?? null,
        tenant_id: tenant?.id ?? null,
        unit_id: tenant?.unit_id ?? null,
        last_message_at: receivedAt,
        last_message_preview: preview,
      },
      { onConflict: "wa_id" },
    )
    .select("id")
    .single();

  if (conversationError) {
    throw conversationError;
  }

  const media = await maybeStoreInboundMedia(
    supabase,
    conversation.id as string,
    message,
  );
  const sourceMedia = getMessageMedia(message);

  const { data: insertedMessage, error: messageError } = await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversation.id,
      direction: "inbound",
      whatsapp_message_id: message.id,
      message_type: message.type,
      body: getMessageBody(message),
      media_id: media?.mediaId ?? null,
      media_mime_type: media?.mimeType ?? sourceMedia?.mime_type ?? null,
      media_sha256: sourceMedia?.sha256 ?? null,
      storage_bucket: media?.bucket ?? null,
      storage_path: media?.path ?? null,
      delivery_status: "received",
      raw_payload: message,
      created_at: receivedAt,
    })
    .select("id")
    .single();

  if (messageError) {
    throw messageError;
  }

  await supabase.from("audit_logs").insert({
    action: "whatsapp.message.received",
    entity_type: "whatsapp_message",
    entity_id: insertedMessage.id,
    metadata: {
      conversation_id: conversation.id,
      whatsapp_message_id: message.id,
      message_type: message.type,
      auto_linked_tenant_id: tenant?.id ?? null,
    },
  });

  try {
    const notificationResult = await notifyStaffOfNewTenantMessage(supabase, {
      body: getMessageBody(message),
      contactName: contact?.profile?.name ?? null,
      conversationId: conversation.id as string,
      messageId: insertedMessage.id as string,
      messageType: message.type,
      tenantPhone,
    });

    await supabase.from("audit_logs").insert({
      action: notificationResult.skipped
        ? "email.notification.skipped"
        : "email.notification.sent",
      entity_type: "whatsapp_message",
      entity_id: insertedMessage.id,
      metadata: {
        conversation_id: conversation.id,
        reason: notificationResult.skipped ? notificationResult.reason : null,
        recipient_count: notificationResult.skipped
          ? 0
          : notificationResult.recipientCount,
        resend_email_id: notificationResult.skipped
          ? null
          : notificationResult.resendEmailId,
      },
    });
  } catch (error) {
    await supabase.from("audit_logs").insert({
      action: "email.notification.failed",
      entity_type: "whatsapp_message",
      entity_id: insertedMessage.id,
      metadata: {
        conversation_id: conversation.id,
        error_message: error instanceof Error ? error.message : "Email notification failed.",
      },
    });
  }

  return {
    messageId: insertedMessage.id as string,
    conversationId: conversation.id as string,
  };
}

async function maybeStoreInboundMedia(
  supabase: SupabaseClient,
  conversationId: string,
  message: WhatsAppInboundMessage,
) {
  const sourceMedia = getMessageMedia(message);

  if (!sourceMedia?.id || !["image", "video"].includes(message.type)) {
    return null;
  }

  const { accessToken, apiVersion } = getWhatsAppConfig();

  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is required to download inbound media.");
  }

  const mediaId = sourceMedia.id;
  const mediaResponse = await fetch(
    `https://graph.facebook.com/${apiVersion}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!mediaResponse.ok) {
    throw new Error(`Meta media lookup failed with ${mediaResponse.status}.`);
  }

  const metadata = (await mediaResponse.json()) as {
    url?: string;
    mime_type?: string;
  };

  if (!metadata.url) {
    throw new Error("Meta media lookup did not return a download URL.");
  }

  const downloadResponse = await fetch(metadata.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!downloadResponse.ok) {
    throw new Error(`Meta media download failed with ${downloadResponse.status}.`);
  }

  const mimeType =
    metadata.mime_type ??
    sourceMedia.mime_type ??
    (message.type === "video" ? "video/mp4" : "image/jpeg");
  const extension = extensionForMime(mimeType);
  const path = `whatsapp/${conversationId}/${message.id}.${extension}`;
  const buffer = Buffer.from(await downloadResponse.arrayBuffer());

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return {
    bucket: MEDIA_BUCKET,
    path,
    mediaId,
    mimeType,
  };
}

export async function sendWhatsAppText(to: string, body: string) {
  const { accessToken, phoneNumberId, apiVersion } = getWhatsAppConfig();

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp sending is not configured.");
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizePhoneNumber(to),
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? `Meta send failed with ${response.status}.`,
    );
  }

  return payload as {
    messages?: Array<{ id?: string; message_status?: string }>;
    contacts?: Array<{ wa_id?: string; input?: string }>;
  };
}

function getMessageBody(message: WhatsAppInboundMessage) {
  if (message.type === "text") {
    return message.text?.body ?? "";
  }

  if (message.type === "image") {
    return message.image?.caption ?? "Inbound image";
  }

  if (message.type === "video") {
    return message.video?.caption ?? "Inbound video";
  }

  return `Unsupported inbound ${message.type} message`;
}

function getMessagePreview(message: WhatsAppInboundMessage) {
  if (message.type === "image") {
    return message.image?.caption ? `Image: ${message.image.caption}` : "Image received";
  }

  if (message.type === "video") {
    return message.video?.caption ? `Video: ${message.video.caption}` : "Video received";
  }

  return getMessageBody(message);
}

function getMessageMedia(message: WhatsAppInboundMessage) {
  if (message.type === "image") {
    return message.image;
  }

  if (message.type === "video") {
    return message.video;
  }

  return null;
}

function extensionForMime(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  if (mimeType.includes("quicktime")) {
    return "mov";
  }

  if (mimeType.includes("3gpp")) {
    return "3gp";
  }

  if (mimeType.includes("png")) {
    return "png";
  }

  if (mimeType.includes("webp")) {
    return "webp";
  }

  if (mimeType.includes("gif")) {
    return "gif";
  }

  return "jpg";
}
