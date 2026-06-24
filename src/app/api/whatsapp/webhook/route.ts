import { NextResponse, type NextRequest } from "next/server";

import { getWhatsAppConfig } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ingestWhatsAppWebhook,
  verifyWhatsAppSignature,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { verifyToken } = getWhatsAppConfig();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const supabase = getSupabaseAdminClient();
  const processed = await ingestWhatsAppWebhook(supabase, payload);

  return NextResponse.json({ ok: true, processed });
}
