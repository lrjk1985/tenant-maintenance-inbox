export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function getServerSupabaseConfig() {
  const publicConfig = getPublicSupabaseConfig();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!publicConfig || !secretKey) {
    return null;
  }

  return { ...publicConfig, secretKey };
}

export function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v23.0";

  return {
    accessToken,
    phoneNumberId,
    verifyToken,
    appSecret,
    apiVersion,
    configured: Boolean(accessToken && phoneNumberId),
  };
}

export function getEmailNotificationConfig() {
  return {
    resendApiKey: process.env.RESEND_API_KEY,
    from:
      process.env.RESEND_FROM_EMAIL ??
      "Tenant Maintenance Requests <notifications@resend.dev>",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL,
    configured: Boolean(process.env.RESEND_API_KEY),
  };
}
