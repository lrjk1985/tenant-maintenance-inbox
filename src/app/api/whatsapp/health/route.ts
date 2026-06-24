import { NextResponse } from "next/server";

import { getPublicSupabaseConfig, getServerSupabaseConfig, getWhatsAppConfig } from "@/lib/env";

export async function GET() {
  const whatsapp = getWhatsAppConfig();

  return NextResponse.json({
    supabasePublicConfigured: Boolean(getPublicSupabaseConfig()),
    supabaseServerConfigured: Boolean(getServerSupabaseConfig()),
    whatsappWebhookVerifyConfigured: Boolean(whatsapp.verifyToken),
    whatsappSendConfigured: whatsapp.configured,
    whatsappAppSecretConfigured: Boolean(whatsapp.appSecret),
    graphApiVersion: whatsapp.apiVersion,
  });
}
